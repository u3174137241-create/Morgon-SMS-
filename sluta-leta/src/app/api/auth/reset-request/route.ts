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
  if (user) {
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

  // E-post är inte konfigurerat i den här miljön — utan detta skulle ingen
  // (varken riktiga eller obefintliga konton) någonsin komma vidare, eftersom
  // länken annars bara loggas server-side. Skicka länken direkt i svaret
  // istället, i båda fallen, så att formen inte avslöjar om kontot finns.
  if (!isEmailConfigured()) {
    const resetUrl = `${process.env.APP_BASE_URL ?? "http://localhost:3000"}/aterstall-losenord?token=${rawToken}`;
    return jsonOk({
      ok: true,
      message: "E-post är inte konfigurerat ännu — om kontot finns kan du återställa direkt här istället.",
      resetUrl,
    });
  }

  return jsonOk({ ok: true, message: "Om kontot finns har ett mejl med instruktioner skickats." });
}
