"use client";

import { useEffect, useState } from "react";
import { useCurrentUser } from "@/lib/useCurrentUser";

type Overview = {
  userCount: number;
  activeSearches: number;
  totalOffers: number;
  acceptedOffers: number;
  completedTransactions: number;
  activePlusCount: number;
  contactFeeRevenueSek: number;
  contactFeePaidCount: number;
  openReports: number;
  transactionsByState: { state: string; _count: number }[];
};

export default function AdminPage() {
  const { user, loading } = useCurrentUser();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetch("/api/admin/overview")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        setOverview(data);
      })
      .catch((e) => setError(e.message));
  }, [user]);

  if (loading) return <p className="text-sm text-gray-400">Laddar…</p>;
  if (!user?.isAdmin) return <p className="text-sm text-red-600">Kräver adminbehörighet.</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!overview) return <p className="text-sm text-gray-400">Laddar statistik…</p>;

  const stats = [
    { label: "Användare", value: overview.userCount },
    { label: "Aktiva sökningar", value: overview.activeSearches },
    { label: "Erbjudanden totalt", value: overview.totalOffers },
    { label: "Godkända erbjudanden", value: overview.acceptedOffers },
    { label: "Genomförda affärer", value: overview.completedTransactions },
    { label: "Aktiva Plus-medlemmar", value: overview.activePlusCount },
    { label: "Kontaktavgiftsintäkt (kr)", value: overview.contactFeeRevenueSek },
    { label: "Betalda kontaktavgifter", value: overview.contactFeePaidCount },
    { label: "Öppna rapporter", value: overview.openReports },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-kungsbla-700">Admin — översikt</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="card">
            <p className="text-2xl font-bold text-kungsbla-600">{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div>
        <h2 className="mb-2 text-lg font-bold text-kungsbla-700">Transaktioner per status</h2>
        <div className="flex flex-col gap-1">
          {overview.transactionsByState.map((s) => (
            <div key={s.state} className="flex justify-between rounded-lg bg-gray-50 px-3 py-1.5 text-sm">
              <span>{s.state}</span>
              <span className="font-semibold">{s._count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
