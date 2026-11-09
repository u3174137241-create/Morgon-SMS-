import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { calculateContactFee } from "@/lib/fees";
import { isPlusActive, getFreeTrialChatsRemaining } from "@/lib/plus";
import { transitionTransaction } from "@/lib/transactions";

// "Ge åtkomst" — köparen godkänner ett erbjudande. Backend avgör alltid om
// säljaren har Plus (avgiftsfritt) eller måste betala kontaktavgift — aldrig frontend.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return jsonError("Du måste vara inloggad.", 401);

  const offer = await prisma.offer.findUnique({
    where: { id },
    include: { search: true, transaction: true },
  });
  if (!offer) return jsonError("Erbjudandet hittades inte.", 404);
  if (!offer.search || offer.search.userId !== user.id) {
    return jsonError("Bara köparen kan godkänna det här erbjudandet.", 403);
  }
  if (!["SENT", "VIEWED"].includes(offer.status)) return jsonError("Erbjudandet är inte längre öppet.", 400);
  if (offer.transaction) return jsonError("Erbjudandet är redan godkänt.", 409);
  if (offer.sellerId === user.id) return jsonError("Du kan inte godkänna ditt eget erbjudande.", 400);

  const offerId = offer.id;
  const sellerId = offer.sellerId;
  const buyerId = user.id;
  const offerPrice = offer.price;

  const sellerHasPlus = await isPlusActive(sellerId);
  const feeAmount = calculateContactFee(offerPrice);

  // Räkningen av kvarvarande gratischattar görs inuti en Serializable-
  // transaktion tillsammans med att den nya raden skapas. Utan det kunde två
  // samtidiga godkännanden för samma säljare (t.ex. två köpare som accepterar
  // bud nästan samtidigt) båda läsa samma, för låga, antal och båda beviljas
  // en gratischatt — säljaren hade då kunnat få fler än de avsedda 5. Vid en
  // skrivkonflikt gör Postgres en av transaktionerna att misslyckas; vi gör
  // då ett enda nytt försök, vilket räcker för den här typen av kollision.
  const result = await runAcceptTransaction();

  async function runAcceptTransaction(attempt = 0): Promise<Awaited<ReturnType<typeof attemptOnce>>> {
    try {
      return await attemptOnce();
    } catch (err) {
      const isSerializationFailure = err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034";
      if (isSerializationFailure && attempt < 1) return runAcceptTransaction(attempt + 1);
      throw err;
    }
  }

  function attemptOnce() {
    return prisma.$transaction(
      async (tx) => {
        const freeTrialRemaining = sellerHasPlus ? 0 : await getFreeTrialChatsRemaining(sellerId, tx);
        const sellerOnFreeTrial = !sellerHasPlus && freeTrialRemaining > 0;

        await tx.offer.update({ where: { id: offerId }, data: { status: "ACCEPTED" } });

        const transaction = await tx.transaction.create({
          data: {
            offerId,
            buyerId,
            sellerId,
            amount: offerPrice,
            contactFeeWaived: sellerHasPlus || sellerOnFreeTrial,
          },
        });

        if (sellerHasPlus || sellerOnFreeTrial) {
          await tx.contactFee.create({
            data: {
              transactionId: transaction.id,
              amount: feeAmount,
              status: sellerHasPlus ? "WAIVED_PLUS" : "WAIVED_TRIAL",
            },
          });
          await transitionTransaction(
            tx,
            transaction.id,
            "CHAT_UNLOCKED",
            sellerHasPlus ? "Plus-medlem — avgift avskriven" : "Gratis provchatt — avgift avskriven"
          );
          await tx.conversation.create({ data: { transactionId: transaction.id } });
          await tx.notification.create({
            data: {
              userId: sellerId,
              type: "CHAT_UNLOCKED",
              payload: { transactionId: transaction.id },
            },
          });
        } else {
          await tx.contactFee.create({
            data: {
              transactionId: transaction.id,
              amount: feeAmount,
              status: "PENDING",
            },
          });
          await transitionTransaction(tx, transaction.id, "CONTACT_FEE_PENDING", "Väntar på kontaktavgift");
          await tx.notification.create({
            data: {
              userId: sellerId,
              type: "CONTACT_FEE_REQUIRED",
              payload: { transactionId: transaction.id, amount: feeAmount },
            },
          });
        }

        return tx.transaction.findUniqueOrThrow({ where: { id: transaction.id }, include: { contactFee: true } });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  }

  return jsonOk({ transaction: result });
}
