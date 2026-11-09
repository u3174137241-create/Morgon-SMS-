import { prisma } from "@/lib/db";
import { FREE_TRIAL_CHAT_LIMIT } from "@/lib/fees";

export async function isPlusActive(userId: string): Promise<boolean> {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub) return false;
  const activeStatuses = new Set(["ACTIVE", "CANCEL_AT_PERIOD_END"]);
  if (!activeStatuses.has(sub.status)) return false;
  if (sub.currentPeriodEnd && sub.currentPeriodEnd < new Date()) return false;
  return true;
}

// Räknar hur många chattar den här användaren någonsin fått upplåsta som
// säljare — betalda, Plus-avskrivna eller via de gratis provchattarna. Det
// är det här talet som avgör om nästa godkända bud fortfarande är gratis.
export async function getUnlockedChatCount(sellerId: string): Promise<number> {
  return prisma.contactFee.count({
    where: {
      transaction: { sellerId },
      status: { in: ["PAID", "WAIVED_PLUS", "WAIVED_TRIAL"] },
    },
  });
}

export async function getFreeTrialChatsRemaining(sellerId: string): Promise<number> {
  const used = await getUnlockedChatCount(sellerId);
  return Math.max(0, FREE_TRIAL_CHAT_LIMIT - used);
}
