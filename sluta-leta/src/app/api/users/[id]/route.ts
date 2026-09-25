import { prisma } from "@/lib/db";
import { publicProfile } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.status !== "ACTIVE") return jsonError("Hittades inte.", 404);

  const [reviews, activeSearches, searchCount, offerCount] = await Promise.all([
    prisma.review.findMany({
      where: { targetId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { author: { select: { name: true, avatarUrl: true } } },
    }),
    prisma.search.findMany({
      where: { userId: id, status: { in: ["ACTIVE", "PAUSED"] }, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, budgetMax: true, location: true, status: true },
    }),
    prisma.search.count({ where: { userId: id } }),
    prisma.offer.count({ where: { sellerId: id } }),
  ]);

  return jsonOk({ profile: publicProfile(user), reviews, activeSearches, searchCount, offerCount });
}
