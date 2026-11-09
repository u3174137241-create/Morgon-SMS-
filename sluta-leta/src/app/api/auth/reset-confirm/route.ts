import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/tokens";
import { hashPassword } from "@/lib/password";
import { jsonError, jsonOk } from "@/lib/http";
import { confirmPasswordResetSchema } from "@/lib/validation";
import { rateLimit, clientKeyFromRequest } from "@/lib/rateLimit";

export async function POST(req: Request) {
  const { allowed } = rateLimit(clientKeyFromRequest(req, "reset-confirm"), 20, 15 * 60 * 1000);
  if (!allowed) return jsonError("För många försök. Försök igen senare.", 429);

  const body = await req.json().catch(() => null);
  const parsed = confirmPasswordResetSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Ogiltig indata.", 400);

  const tokenHash = hashToken(parsed.data.token);
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return jsonError("Länken är ogiltig eller har gått ut.", 400);
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await prisma.$transaction([
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
  ]);

  return jsonOk({ ok: true });
}
