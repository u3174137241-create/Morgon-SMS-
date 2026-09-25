import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) return jsonError("Kräver adminbehörighet.", 403);

  const reports = await prisma.report.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { reporter: { select: { name: true, email: true } } },
  });

  return jsonOk({ reports });
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) return jsonError("Kräver adminbehörighet.", 403);

  const body = await req.json().catch(() => null);
  const id = body?.id;
  const status = body?.status;
  if (typeof id !== "string" || (status !== "ACTIONED" && status !== "DISMISSED")) {
    return jsonError("Ogiltig indata", 400);
  }

  const report = await prisma.report.update({ where: { id }, data: { status } });
  return jsonOk({ report });
}
