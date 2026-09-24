import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { transitionTransaction } from "@/lib/transactions";

// Endera parten bekräftar att affären är genomförd. När båda bekräftat
// markeras transaktionen COMPLETED och deals-räknaren höjs för båda.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return jsonError("Du måste vara inloggad.", 401);

  const transaction = await prisma.transaction.findUnique({ where: { id } });
  if (!transaction) return jsonError("Transaktionen hittades inte.", 404);
  if (transaction.buyerId !== user.id && transaction.sellerId !== user.id) {
    return jsonError("Du var inte del av den här affären.", 403);
  }
  if (!["CHAT_UNLOCKED", "DEAL_IN_PROGRESS", "WAITING_FOR_COMPLETION"].includes(transaction.state)) {
    return jsonError("Affären kan inte markeras som klar i det här läget.", 400);
  }

  const isBuyer = transaction.buyerId === user.id;

  const updated = await prisma.$transaction(async (tx) => {
    const data = isBuyer ? { buyerConfirmedAt: new Date() } : { sellerConfirmedAt: new Date() };
    const t = await tx.transaction.update({ where: { id }, data });

    const bothConfirmed = Boolean(t.buyerConfirmedAt && t.sellerConfirmedAt);

    if (bothConfirmed) {
      if (t.state !== "COMPLETED") {
        await transitionTransaction(tx, id, "COMPLETED", "Båda parter bekräftade");
        await tx.user.update({ where: { id: t.buyerId }, data: { dealsCompleted: { increment: 1 } } });
        await tx.user.update({ where: { id: t.sellerId }, data: { dealsCompleted: { increment: 1 } } });
      }
    } else if (t.state === "CHAT_UNLOCKED") {
      await transitionTransaction(tx, id, "DEAL_IN_PROGRESS", "En part bekräftade, väntar på den andra");
    } else if (t.state === "DEAL_IN_PROGRESS") {
      await transitionTransaction(tx, id, "WAITING_FOR_COMPLETION", "Väntar på slutgiltig bekräftelse");
    }

    return tx.transaction.findUniqueOrThrow({ where: { id } });
  });

  return jsonOk({ transaction: updated });
}
