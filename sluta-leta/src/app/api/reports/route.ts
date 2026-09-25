import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { createReportSchema } from "@/lib/validation";
import { rateLimit, clientKeyFromRequest } from "@/lib/rateLimit";

// POST /api/reports — vem som helst inloggad kan rapportera en användare,
// sökning eller listing. Admin ser öppna rapporter på /admin.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Du måste vara inloggad.", 401);

  const { allowed } = rateLimit(clientKeyFromRequest(req, `report:${user.id}`), 10, 60 * 60 * 1000);
  if (!allowed) return jsonError("För många rapporter. Försök igen senare.", 429);

  const body = await req.json().catch(() => null);
  const parsed = createReportSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Ogiltig indata", 400);

  const report = await prisma.report.create({
    data: {
      reporterId: user.id,
      targetType: parsed.data.targetType,
      targetId: parsed.data.targetId,
      reason: parsed.data.reason,
    },
  });

  return jsonOk({ report }, 201);
}
