import { prisma } from "@/lib/db";
import { generateRawToken, hashToken } from "@/lib/tokens";
import { sendPasswordResetEmail, isEmailConfigured } from "@/lib/email";
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

  // Ett token genereras och en resetUrl byggs likadant oavsett om kontot finns,
  // så svarets form aldrig läcker vilka e-postadresser som är registrerade.
  // Bara riktiga konton får ett token som faktiskt sparas och fungerar.
  const rawToken = generateRawToken();
  const resetUrl = `${process.env.APP_BASE_URL ?? "http://localhost:3000"}/aterstall-losenord?token=${rawToken}`;

  let emailSent = false;
  if (user) {
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    if (isEmailConfigured()) {
      try {
        await sendPasswordResetEmail(user.email, resetUrl);
        emailSent = true;
      } catch (err) {
        console.error("[reset-request] kunde inte skicka återställningsmejl", err);
      }
    }
  }

  // E-post är inte konfigurerat, kontot finns inte, eller själva sändningen
  // misslyckades — i alla dessa fall skulle användaren annars aldrig komma
  // vidare. Skicka länken direkt i svaret istället, likadant i alla fall,
  // så att formen aldrig avslöjar om kontot finns.
  if (!emailSent) {
    return jsonOk({
      ok: true,
      message: "E-post kunde inte skickas just nu — om kontot finns kan du återställa direkt här istället.",
      resetUrl,
    });
  }

  return jsonOk({ ok: true, message: "Om kontot finns har ett mejl med instruktioner skickats." });
}
