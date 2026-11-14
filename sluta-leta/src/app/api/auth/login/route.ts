import { prisma } from "@/lib/db";
import { verifyPassword, hashPassword } from "@/lib/password";
import { setSessionCookie } from "@/lib/session";
import { jsonError, jsonOk } from "@/lib/http";
import { loginSchema } from "@/lib/validation";
import { rateLimit, clientKeyFromRequest } from "@/lib/rateLimit";
import { publicProfile } from "@/lib/auth";

// Samma kostnadsfaktor (SALT_ROUNDS) som riktiga lösenordshashar, så att
// jämförelsen mot en obefintlig användare tar lika lång tid som mot en
// riktig — se kommentaren vid bcrypt.compare-anropet nedan. Cachas lazy
// per kallstart istället för top-level await, som inte är tillförlitligt
// i Next.js serverless-bundling.
let dummyHashPromise: Promise<string> | null = null;
function getDummyHash(): Promise<string> {
  if (!dummyHashPromise) dummyHashPromise = hashPassword("not-a-real-account-password");
  return dummyHashPromise;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return jsonError("Ogiltig indata.", 400);
  const { email, password } = parsed.data;

  const { allowed, retryAfterMs } = rateLimit(clientKeyFromRequest(req, `login:${email}`), 8, 15 * 60 * 1000);
  if (!allowed) {
    return jsonError(`För många inloggningsförsök. Försök igen om ${Math.ceil(retryAfterMs / 60000)} min.`, 429);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  // Kör alltid bcrypt.compare, även när användaren inte finns (mot en dummy-hash) —
  // annars svarar "okänd e-post" nästan direkt medan "fel lösenord" tar ~100ms
  // (bcrypt-tiden), vilket läcker exakt vilka e-postadresser som är registrerade
  // via svarstiden, trots det identiska felmeddelandet.
  const valid = await verifyPassword(password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || user.status !== "ACTIVE" || !valid) return jsonError("Fel e-post eller lösenord.", 401);

  await setSessionCookie(user.id, user.sessionVersion);
  return jsonOk({ ok: true, user: publicProfile(user) });
}
