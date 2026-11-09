import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { FREE_TRIAL_CHAT_LIMIT } from "@/lib/fees";

type Db = Prisma.TransactionClient | typeof prisma;

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
//
// Tar emot en valfri `db` (t.ex. en Prisma-transaktion). Anropas den utanför
// en transaktion med Serializable isolering finns ett race: två samtidiga
// accept-anrop för samma säljare kan båda läsa samma (för låga) antal och
// båda bevilja en gratischatt. Se accept/route.ts där räkningen körs inuti
// en Serializable-transaktion tillsammans med skapandet av raden.
export async function getUnlockedChatCount(sellerId: string, db: Db = prisma): Promise<number> {
  return db.contactFee.count({
    where: {
      transaction: { sellerId },
      status: { in: ["PAID", "WAIVED_PLUS", "WAIVED_TRIAL"] },
    },
  });
}

export async function getFreeTrialChatsRemaining(sellerId: string, db: Db = prisma): Promise<number> {
  const used = await getUnlockedChatCount(sellerId, db);
  return Math.max(0, FREE_TRIAL_CHAT_LIMIT - used);
}
