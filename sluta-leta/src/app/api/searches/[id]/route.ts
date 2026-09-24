import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const search = await prisma.search.findUnique({
    where: { id },
    include: {
      images: { orderBy: { order: "asc" } },
      user: { select: { id: true, name: true, avatarUrl: true, emailVerifiedAt: true } },
      offers: {
        include: {
          images: true,
          seller: { select: { id: true, name: true, avatarUrl: true, emailVerifiedAt: true, ratingSum: true, ratingCount: true, dealsCompleted: true } },
        },
        orderBy: { price: "asc" },
      },
    },
  });
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
  const allowedStatuses = new Set(["FULFILLED", "CANCELLED"]);
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
