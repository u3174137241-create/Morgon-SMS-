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

type Report = {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  createdAt: string;
  reporter: { name: string; email: string };
};

export default function AdminPage() {
  const { user, loading } = useCurrentUser();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [error, setError] = useState<string | null>(null);

  function loadReports() {
    fetch("/api/admin/reports")
      .then((r) => r.json())
      .then((d) => setReports(d.reports ?? []));
  }

  useEffect(() => {
    if (!user) return;
    fetch("/api/admin/overview")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        setOverview(data);
      })
      .catch((e) => setError(e.message));
    loadReports();
  }, [user]);

  async function resolveReport(id: string, status: "ACTIONED" | "DISMISSED") {
    await fetch("/api/admin/reports", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    loadReports();
  }

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

      <div>
        <h2 className="mb-2 text-lg font-bold text-kungsbla-700">Öppna rapporter ({reports.length})</h2>
        {reports.length === 0 ? (
          <p className="text-sm text-gray-400">Inga öppna rapporter.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {reports.map((r) => (
              <div key={r.id} className="card flex flex-col gap-1">
                <p className="text-xs text-gray-400">
                  {r.targetType} {r.targetId} · rapporterad av {r.reporter.name} ({r.reporter.email})
                </p>
                <p className="text-sm text-gray-700">{r.reason}</p>
                <div className="mt-1 flex gap-2">
                  <button
                    className="text-xs font-semibold text-kungsbla-600 underline"
                    onClick={() => resolveReport(r.id, "ACTIONED")}
                  >
                    Åtgärdad
                  </button>
                  <button
                    className="text-xs text-gray-400 underline"
                    onClick={() => resolveReport(r.id, "DISMISSED")}
                  >
                    Avfärda
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
