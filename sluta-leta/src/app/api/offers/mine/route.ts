import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";

// GET /api/offers/mine — "Mina erbjudanden", säljarens egen lista över alla erbjudanden hen lämnat.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError("Du måste vara inloggad.", 401);

  const offers = await prisma.offer.findMany({
    where: { sellerId: user.id },
    include: {
      images: true,
      search: { select: { id: true, title: true, status: true, expiresAt: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return jsonOk({ offers });
}
