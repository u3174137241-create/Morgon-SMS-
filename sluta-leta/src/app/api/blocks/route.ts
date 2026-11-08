import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { blockUserSchema } from "@/lib/validation";

// GET /api/blocks — lista över användare den inloggade har blockerat.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError("Du måste vara inloggad.", 401);

  const blocks = await prisma.userBlock.findMany({
    where: { blockerId: user.id },
    include: { blocked: { select: { id: true, name: true, avatarUrl: true } } },
    orderBy: { createdAt: "desc" },
  });

  return jsonOk({ blocks });
}

// POST /api/blocks — blockera en annan användare.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Du måste vara inloggad.", 401);

  const body = await req.json().catch(() => null);
  const parsed = blockUserSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Ogiltig indata.", 400);
  const { userId } = parsed.data;

  if (userId === user.id) return jsonError("Du kan inte blockera dig själv.", 400);

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return jsonError("Användaren hittades inte.", 404);

  await prisma.userBlock.upsert({
    where: { blockerId_blockedId: { blockerId: user.id, blockedId: userId } },
    create: { blockerId: user.id, blockedId: userId },
    update: {},
  });

  return jsonOk({ blocked: true });
}

// DELETE /api/blocks — avblockera en användare (userId i query-strängen).
export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Du måste vara inloggad.", 401);

  const userId = new URL(req.url).searchParams.get("userId");
  if (!userId) return jsonError("Ogiltig förfrågan.", 400);

  await prisma.userBlock.deleteMany({ where: { blockerId: user.id, blockedId: userId } });
  return jsonOk({ blocked: false });
}
