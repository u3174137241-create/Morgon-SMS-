import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();

  const include = {
    images: { orderBy: { order: "asc" as const } },
    user: { select: { id: true, name: true, avatarUrl: true, emailVerifiedAt: true } },
    offers: {
      include: {
        images: true,
        seller: { select: { id: true, name: true, avatarUrl: true, emailVerifiedAt: true, ratingSum: true, ratingCount: true, dealsCompleted: true } },
      },
      orderBy: { price: "asc" as const },
    },
  };

  let search = await prisma.search.findUnique({ where: { id }, include });
  if (!search) return jsonError("Sökningen hittades inte.", 404);

  let needsRefetch = false;
  // Efterlysningen är utgången men har fortfarande öppna erbjudanden kvar — markera dem som utgångna.
  if (search.expiresAt < new Date()) {
    const { count } = await prisma.offer.updateMany({
      where: { searchId: id, status: { in: ["SENT", "VIEWED"] } },
      data: { status: "EXPIRED" },
    });
    needsRefetch = count > 0;
  } else if (user && user.id === search.userId) {
    // Köparen (sökningens ägare) tittar på sina erbjudanden — markera olästa som visade.
    const { count } = await prisma.offer.updateMany({
      where: { searchId: id, status: "SENT" },
      data: { status: "VIEWED" },
    });
    needsRefetch = count > 0;
  }

  if (!needsRefetch) return jsonOk({ search });

  search = await prisma.search.findUnique({ where: { id }, include });
  if (!search) return jsonError("Sökningen hittades inte.", 404);
  return jsonOk({ search });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return jsonError("Du måste vara inloggad.", 401);

  const search = await prisma.search.findUnique({ where: { id } });
  if (!search) return jsonError("Sökningen hittades inte.", 404);
  if (search.userId !== user.id) return jsonError("Du äger inte den här sökningen.", 403);

  const body = await req.json().catch(() => ({}));
  const allowedStatuses = new Set(["FULFILLED", "CANCELLED", "PAUSED", "ACTIVE"]);
  if (typeof body.status === "string" && allowedStatuses.has(body.status)) {
    const updated = await prisma.search.update({ where: { id }, data: { status: body.status } });
    return jsonOk({ search: updated });
  }
  if (body.extend === true) {
    const updated = await prisma.search.update({
      where: { id },
      data: { expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), status: "ACTIVE" },
    });
    return jsonOk({ search: updated });
  }

  return jsonError("Inget giltigt fält att uppdatera.", 400);
}
