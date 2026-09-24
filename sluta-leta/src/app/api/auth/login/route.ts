import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { setSessionCookie } from "@/lib/session";
import { jsonError, jsonOk } from "@/lib/http";
import { loginSchema } from "@/lib/validation";
import { rateLimit, clientKeyFromRequest } from "@/lib/rateLimit";
import { publicProfile } from "@/lib/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return jsonError("Ogiltig indata", 400);
  const { email, password } = parsed.data;

  const { allowed, retryAfterMs } = rateLimit(clientKeyFromRequest(req, `login:${email}`), 8, 15 * 60 * 1000);
  if (!allowed) {
    return jsonError(`För många inloggningsförsök. Försök igen om ${Math.ceil(retryAfterMs / 60000)} min.`, 429);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  // Konstant svar oavsett om användaren finns, för att inte läcka vilka e-postadresser som är registrerade.
  if (!user || user.status !== "ACTIVE") return jsonError("Fel e-post eller lösenord.", 401);

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return jsonError("Fel e-post eller lösenord.", 401);

  await setSessionCookie(user.id);
  return jsonOk({ ok: true, user: publicProfile(user) });
}
