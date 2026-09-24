import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { generateRawToken, hashToken } from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/email";
import { jsonError, jsonOk } from "@/lib/http";
import { registerSchema } from "@/lib/validation";
import { rateLimit, clientKeyFromRequest } from "@/lib/rateLimit";

export async function POST(req: Request) {
  const { allowed } = rateLimit(clientKeyFromRequest(req, "register"), 5, 15 * 60 * 1000);
  if (!allowed) return jsonError("För många försök. Försök igen senare.", 429);

  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Ogiltig indata", 400);
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
  await sendVerificationEmail(email, verifyUrl);

  return jsonOk({ ok: true, message: "Konto skapat. Kolla din e-post för att bekräfta adressen." });
}
