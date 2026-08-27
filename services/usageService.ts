import AsyncStorage from "@react-native-async-storage/async-storage";
import { FREE_TIER_MONTHLY_LIMIT, type SubscriptionTier } from "@/types/user";

const USAGE_KEY = "bilkoll.usage.v1";
const TIER_KEY = "bilkoll.subscriptionTier.v1";

interface UsageRecord {
  month: string; // "2026-08"
  count: number;
}

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

async function readUsage(): Promise<UsageRecord> {
  const raw = await AsyncStorage.getItem(USAGE_KEY);
  const month = currentMonthKey();
  if (!raw) return { month, count: 0 };
  const parsed = JSON.parse(raw) as UsageRecord;
  return parsed.month === month ? parsed : { month, count: 0 };
}

export const usageService = {
  async getTier(): Promise<SubscriptionTier> {
    const raw = await AsyncStorage.getItem(TIER_KEY);
    return raw === "premium" ? "premium" : "free";
  },

  async setTier(tier: SubscriptionTier): Promise<void> {
    await AsyncStorage.setItem(TIER_KEY, tier);
  },

  async getUsedThisMonth(): Promise<number> {
    return (await readUsage()).count;
  },

  async getRemaining(): Promise<number> {
    const tier = await this.getTier();
    if (tier === "premium") return Infinity;
    const used = await this.getUsedThisMonth();
    return Math.max(0, FREE_TIER_MONTHLY_LIMIT - used);
  },

  async recordAnalysisUsed(): Promise<void> {
    const usage = await readUsage();
    usage.count += 1;
    await AsyncStorage.setItem(USAGE_KEY, JSON.stringify(usage));
  },

  async canAnalyze(): Promise<boolean> {
    return (await this.getRemaining()) > 0;
  },

  limit: FREE_TIER_MONTHLY_LIMIT,
};
