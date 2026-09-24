"use client";

import { useEffect, useState, useCallback } from "react";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  verified: boolean;
  isAdmin: boolean;
  ratingAvg: number | null;
  ratingCount: number;
  dealsCompleted: number;
};

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null | undefined>(undefined);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/auth/me");
    const data = await res.json();
    setUser(data.user);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { user, loading: user === undefined, refresh };
}
