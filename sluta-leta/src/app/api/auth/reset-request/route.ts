import { prisma } from "@/lib/db";
import { generateRawToken, hashToken } from "@/lib/tokens";
import { sendPasswordResetEmail } from "@/lib/email";
import { jsonOk, jsonError } from "@/lib/http";
import { requestPasswordResetSchema } from "@/lib/validation";
import { rateLimit, clientKeyFromRequest } from "@/lib/rateLimit";

export async function POST(req: Request) {
  const { allowed } = rateLimit(clientKeyFromRequest(req, "reset-request"), 5, 15 * 60 * 1000);
  if (!allowed) return jsonError("För många försök. Försök igen senare.", 429);

  const body = await req.json().catch(() => null);
  const parsed = requestPasswordResetSchema.safeParse(body);
  if (!parsed.success) return jsonError("Ogiltig e-postadress", 400);

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  // Svara alltid likadant oavsett om kontot finns, för att inte läcka registrerade e-postadresser.
  if (user) {
    const rawToken = generateRawToken();
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    const resetUrl = `${process.env.APP_BASE_URL ?? "http://localhost:3000"}/aterstall-losenord?token=${rawToken}`;
    await sendPasswordResetEmail(user.email, resetUrl);
  }

  return jsonOk({ ok: true, message: "Om kontot finns har ett mejl med instruktioner skickats." });
}
