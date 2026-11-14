import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { transitionTransaction } from "@/lib/transactions";
import { sendPushToUser } from "@/lib/push";

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
  // Har den här parten redan bekräftat tidigare? Då är anropet en omtagning
  // (t.ex. dubbelklick) utan ny information, och ska inte flytta
  // tillståndet vidare igen — annars kunde en part ensam trigga
  // DEAL_IN_PROGRESS -> WAITING_FOR_COMPLETION utan att motparten gjort något.
  const alreadyConfirmedByThisUser = Boolean(isBuyer ? transaction.buyerConfirmedAt : transaction.sellerConfirmedAt);

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
    } else if (!alreadyConfirmedByThisUser && t.state === "CHAT_UNLOCKED") {
      await transitionTransaction(tx, id, "DEAL_IN_PROGRESS", "En part bekräftade, väntar på den andra");
    } else if (!alreadyConfirmedByThisUser && t.state === "DEAL_IN_PROGRESS") {
      await transitionTransaction(tx, id, "WAITING_FOR_COMPLETION", "Väntar på slutgiltig bekräftelse");
    }

    return tx.transaction.findUniqueOrThrow({ where: { id } });
  });

  const otherPartyId = isBuyer ? updated.sellerId : updated.buyerId;
  if (updated.state === "COMPLETED") {
    const payload = { title: "Affären är genomförd!", body: "Båda har bekräftat — glöm inte att lämna en recension.", url: `/meddelanden/${id}` };
    await Promise.all([sendPushToUser(updated.buyerId, payload), sendPushToUser(updated.sellerId, payload)]);
  } else if (!alreadyConfirmedByThisUser) {
    await prisma.notification.create({
      data: { userId: otherPartyId, type: "TRANSACTION_UPDATED", payload: { transactionId: id, reason: "awaiting_your_confirmation" } },
    });
    await sendPushToUser(otherPartyId, {
      title: "Bekräfta affären",
      body: `${user.name} har markerat affären som klar — bekräfta från din sida när ni är överens.`,
      url: `/meddelanden/${id}`,
    });
  }

  return jsonOk({ transaction: updated });
}
