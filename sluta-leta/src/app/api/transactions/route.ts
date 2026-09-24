import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";

// GET /api/transactions — lista transaktioner (affärer) för inloggad användare, som köpare eller säljare.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError("Du måste vara inloggad.", 401);

  const transactions = await prisma.transaction.findMany({
    where: { OR: [{ buyerId: user.id }, { sellerId: user.id }] },
    orderBy: { updatedAt: "desc" },
    include: {
      offer: { select: { message: true, price: true } },
      buyer: { select: { id: true, name: true, avatarUrl: true } },
      seller: { select: { id: true, name: true, avatarUrl: true } },
      contactFee: true,
    },
  });

  return jsonOk({ transactions });
}
