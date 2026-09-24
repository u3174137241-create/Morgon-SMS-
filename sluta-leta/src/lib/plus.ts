import { prisma } from "@/lib/db";

export async function isPlusActive(userId: string): Promise<boolean> {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub) return false;
  const activeStatuses = new Set(["ACTIVE", "CANCEL_AT_PERIOD_END"]);
  if (!activeStatuses.has(sub.status)) return false;
  if (sub.currentPeriodEnd && sub.currentPeriodEnd < new Date()) return false;
  return true;
}
