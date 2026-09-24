import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";
import type { User } from "@prisma/client";

export async function getCurrentUser(): Promise<User | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.status !== "ACTIVE") return null;
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
