import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import type { User } from "@prisma/client";

export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || user.status !== "ACTIVE") return null;
  // sessionVersion höjs vid lösenordsåterställning — en token som signerades
  // innan dess (t.ex. en stulen cookie) ska sluta fungera direkt, inte bara
  // när den löper ut om 30 dagar.
  if (user.sessionVersion !== session.sessionVersion) return null;
  return user;
}

export function isEmailVerified(user: User): boolean {
  return Boolean(user.emailVerifiedAt);
}

export function publicProfile(user: User) {
  return {
    id: user.id,
    name: user.name,
    avatarUrl: user.avatarUrl,
    verified: isEmailVerified(user),
    ratingAvg: user.ratingCount > 0 ? Math.round((user.ratingSum / user.ratingCount) * 10) / 10 : null,
    ratingCount: user.ratingCount,
    dealsCompleted: user.dealsCompleted,
    createdAt: user.createdAt,
  };
}
