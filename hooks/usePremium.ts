import { useCallback, useEffect, useState } from "react";
import type { SubscriptionTier } from "@/types/user";
import { usageService } from "@/services/usageService";

export function usePremium() {
  const [tier, setTier] = useState<SubscriptionTier>("free");
  const [remaining, setRemaining] = useState<number>(usageService.limit);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [t, r] = await Promise.all([usageService.getTier(), usageService.getRemaining()]);
      setTier(t);
      setRemaining(r);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const activatePremium = useCallback(async () => {
    await usageService.setTier("premium");
    await reload();
  }, [reload]);

  return {
    tier,
    isPremium: tier === "premium",
    remaining,
    loading,
    reload,
    activatePremium,
  };
}
