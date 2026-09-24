import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { calculateContactFee } from "@/lib/fees";
import { isPlusActive } from "@/lib/plus";
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
  if (offer.status !== "SENT") return jsonError("Erbjudandet är inte längre öppet.", 400);
  if (offer.transaction) return jsonError("Erbjudandet är redan godkänt.", 409);
  if (offer.sellerId === user.id) return jsonError("Du kan inte godkänna ditt eget erbjudande.", 400);

  const sellerHasPlus = await isPlusActive(offer.sellerId);
  const feeAmount = calculateContactFee(offer.price);

  const result = await prisma.$transaction(async (tx) => {
    await tx.offer.update({ where: { id: offer.id }, data: { status: "ACCEPTED" } });

    const transaction = await tx.transaction.create({
      data: {
        offerId: offer.id,
        buyerId: user.id,
        sellerId: offer.sellerId,
        amount: offer.price,
        contactFeeWaived: sellerHasPlus,
      },
    });

    if (sellerHasPlus) {
      await tx.contactFee.create({
        data: {
          transactionId: transaction.id,
          amount: feeAmount,
          status: "WAIVED_PLUS",
        },
      });
      await transitionTransaction(tx, transaction.id, "CHAT_UNLOCKED", "Plus-medlem — avgift avskriven");
      await tx.conversation.create({ data: { transactionId: transaction.id } });
      await tx.notification.create({
        data: {
          userId: offer.sellerId,
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
          userId: offer.sellerId,
          type: "CONTACT_FEE_REQUIRED",
          payload: { transactionId: transaction.id, amount: feeAmount },
        },
      });
    }

    return tx.transaction.findUniqueOrThrow({ where: { id: transaction.id }, include: { contactFee: true } });
  });

  return jsonOk({ transaction: result });
}
