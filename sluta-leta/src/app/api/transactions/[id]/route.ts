import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return jsonError("Du måste vara inloggad.", 401);

  const transaction = await prisma.transaction.findUnique({
    where: { id },
    include: {
      offer: { include: { images: true, search: true } },
      contactFee: true,
      conversation: true,
      buyer: { select: { id: true, name: true, avatarUrl: true } },
      seller: { select: { id: true, name: true, avatarUrl: true } },
    },
  });
  if (!transaction) return jsonError("Transaktionen hittades inte.", 404);
  if (transaction.buyerId !== user.id && transaction.sellerId !== user.id) {
    return jsonError("Du har inte åtkomst till den här transaktionen.", 403);
  }

  return jsonOk({ transaction });
}
