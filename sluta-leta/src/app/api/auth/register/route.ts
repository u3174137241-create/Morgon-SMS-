import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { generateRawToken, hashToken } from "@/lib/tokens";
import { sendVerificationEmail, isEmailConfigured } from "@/lib/email";
import { jsonError, jsonOk } from "@/lib/http";
import { registerSchema } from "@/lib/validation";
import { rateLimit, clientKeyFromRequest } from "@/lib/rateLimit";

export async function POST(req: Request) {
  const { allowed } = rateLimit(clientKeyFromRequest(req, "register"), 5, 15 * 60 * 1000);
  if (!allowed) return jsonError("För många försök. Försök igen senare.", 429);

  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Ogiltig indata.", 400);
  const { email, password, name } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return jsonError("Det finns redan ett konto med den e-postadressen.", 409);

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email, passwordHash, name },
  });

  const rawToken = generateRawToken();
  await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  const verifyUrl = `${process.env.APP_BASE_URL ?? "http://localhost:3000"}/verifiera?token=${rawToken}`;

  // E-post är inte konfigurerat, eller själva sändningen misslyckas (t.ex. att
  // e-postleverantören avvisar avsändaren/mottagaren) — i båda fallen får
  // kontot redan skapats i databasen, så användaren får aldrig fastna utan
  // sätt att verifiera sig. Skicka då länken direkt i svaret istället.
  let emailSent = false;
  if (isEmailConfigured()) {
    try {
      await sendVerificationEmail(email, verifyUrl);
      emailSent = true;
    } catch (err) {
      console.error("[register] kunde inte skicka verifieringsmejl", err);
    }
  }

  if (!emailSent) {
    return jsonOk({
      ok: true,
      message: "Konto skapat. E-post kunde inte skickas just nu — bekräfta direkt här istället.",
      verifyUrl,
    });
  }

  return jsonOk({ ok: true, message: "Konto skapat. Kolla din e-post för att bekräfta adressen." });
}
