export type SubscriptionTier = "free" | "premium";

export interface UserProfile {
  id: string;
  email: string | null;
  subscriptionTier: SubscriptionTier;
  analysesUsedThisMonth: number;
  analysesLimit: number;
  createdAt: string;
}

export const FREE_TIER_MONTHLY_LIMIT = 3;
