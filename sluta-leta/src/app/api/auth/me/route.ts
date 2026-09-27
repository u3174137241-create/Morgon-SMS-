import { prisma } from "@/lib/db";
import { getCurrentUser, publicProfile } from "@/lib/auth";
import { clearSessionCookie } from "@/lib/session";
import { jsonError, jsonOk } from "@/lib/http";
import { isPlusActive } from "@/lib/plus";
import crypto from "crypto";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonOk({ user: null });
  const isPlus = await isPlusActive(user.id);
  return jsonOk({ user: { ...publicProfile(user), email: user.email, isAdmin: user.isAdmin, isPlus } });
}

// GDPR: konto raderas (mjukt) — e-post/lösenord anonymiseras så inloggning
// inte längre är möjlig, men historiska affärer/recensioner som rör andra
// användare bevaras (de har rätt att se sin egen transaktionshistorik).
// Aktiva sökningar, listings och obesvarade erbjudanden avslutas samtidigt —
// annars ligger de kvar synliga i marknadsplatsen utan att någon kan svara.
export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return jsonError("Du måste vara inloggad.", 401);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        status: "DELETED",
        email: `deleted+${user.id}@slutaleta.invalid`,
        passwordHash: crypto.randomBytes(32).toString("hex"),
        name: "Raderad användare",
        avatarUrl: null,
      },
    }),
    prisma.search.updateMany({
      where: { userId: user.id, status: { in: ["ACTIVE", "PAUSED"] } },
      data: { status: "CANCELLED" },
    }),
    prisma.listing.updateMany({
      where: { userId: user.id, status: "ACTIVE" },
      data: { status: "CLOSED" },
    }),
    prisma.offer.updateMany({
      where: { sellerId: user.id, status: "SENT" },
      data: { status: "DECLINED" },
    }),
  ]);
  await clearSessionCookie();

  return jsonOk({ ok: true });
}
