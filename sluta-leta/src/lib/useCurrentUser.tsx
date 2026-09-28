"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  verified: boolean;
  isAdmin: boolean;
  isPlus: boolean;
  ratingAvg: number | null;
  ratingCount: number;
  dealsCompleted: number;
};

type CurrentUserContextValue = {
  user: CurrentUser | null | undefined;
  loading: boolean;
  refresh: () => Promise<void>;
};

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null);

// En delad kontext istället för att varje komponent (NavBar + varje sida som
// behöver användaren) gör sitt eget /api/auth/me-anrop — annars dubbleras
// anropet på varje sida som både renderar NavBar och läser useCurrentUser().
export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null | undefined>(undefined);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/auth/me");
    const data = await res.json();
    setUser(data.user);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <CurrentUserContext.Provider value={{ user, loading: user === undefined, refresh }}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser() {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) throw new Error("useCurrentUser måste användas inuti CurrentUserProvider");
  return ctx;
}
