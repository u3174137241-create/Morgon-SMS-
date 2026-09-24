import { prisma } from "@/lib/db";
import { getCurrentUser, publicProfile } from "@/lib/auth";
import { clearSessionCookie } from "@/lib/session";
import { jsonError, jsonOk } from "@/lib/http";
import crypto from "crypto";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonOk({ user: null });
  return jsonOk({ user: { ...publicProfile(user), email: user.email, isAdmin: user.isAdmin } });
}

// GDPR: konto raderas (mjukt) — e-post/lösenord anonymiseras så inloggning
// inte längre är möjlig, men historiska affärer/recensioner som rör andra
// användare bevaras (de har rätt att se sin egen transaktionshistorik).
export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return jsonError("Du måste vara inloggad.", 401);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      status: "DELETED",
      email: `deleted+${user.id}@slutaleta.invalid`,
      passwordHash: crypto.randomBytes(32).toString("hex"),
      name: "Raderad användare",
      avatarUrl: null,
    },
  });
  await clearSessionCookie();

  return jsonOk({ ok: true });
}
