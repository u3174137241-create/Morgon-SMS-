import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { createReviewSchema } from "@/lib/validation";

// Recensioner kopplas alltid till en riktig transaktion i state COMPLETED,
// vilket förhindrar självrecensioner, falska affärer och dubbla recensioner.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Du måste vara inloggad.", 401);

  const body = await req.json().catch(() => null);
  const parsed = createReviewSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Ogiltig indata", 400);
  const { transactionId, rating, comment } = parsed.data;

  const transaction = await prisma.transaction.findUnique({ where: { id: transactionId } });
  if (!transaction) return jsonError("Transaktionen hittades inte.", 404);
  if (transaction.state !== "COMPLETED") {
    return jsonError("Affären måste vara genomförd innan ni kan recensera varandra.", 400);
  }
  if (transaction.buyerId !== user.id && transaction.sellerId !== user.id) {
    return jsonError("Du var inte del av den här affären.", 403);
  }

  const targetId = transaction.buyerId === user.id ? transaction.sellerId : transaction.buyerId;

  const existing = await prisma.review.findUnique({
    where: { transactionId_authorId: { transactionId, authorId: user.id } },
  });
  if (existing) return jsonError("Du har redan recenserat den här affären.", 409);

  const review = await prisma.$transaction(async (tx) => {
    const created = await tx.review.create({
      data: { transactionId, authorId: user.id, targetId, rating, comment },
    });
    await tx.user.update({
      where: { id: targetId },
      data: { ratingSum: { increment: rating }, ratingCount: { increment: 1 } },
    });
    return created;
  });

  return jsonOk({ review }, 201);
}
