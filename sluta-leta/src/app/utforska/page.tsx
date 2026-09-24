"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type SearchListItem = {
  id: string;
  title: string;
  description: string;
  type: "PRODUCT" | "SERVICE";
  budgetMax: number | null;
  location: string;
  image: string | null;
  offerCount: number;
  user: { name: string; verified: boolean };
};

const TABS = [
  { key: "ALL", label: "Alla" },
  { key: "PRODUCT", label: "Produkter" },
  { key: "SERVICE", label: "Tjänster" },
] as const;

export default function ExplorePage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("ALL");
  const [budgetMax, setBudgetMax] = useState("");
  const [location, setLocation] = useState("");
  const [items, setItems] = useState<SearchListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (tab !== "ALL") params.set("type", tab);
    if (budgetMax) params.set("budgetMax", budgetMax);
    if (location.trim()) params.set("location", location.trim());
    const timeout = setTimeout(() => {
      fetch(`/api/searches?${params.toString()}`)
        .then((r) => r.json())
        .then((d) => setItems(d.searches ?? []))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timeout);
  }, [tab, budgetMax, location]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-kungsbla-700">Utforska</h1>
      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              tab === t.key ? "bg-kungsbla-500 text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          className="input sm:max-w-40"
          type="number"
          placeholder="Max budget (kr)"
          value={budgetMax}
          onChange={(e) => setBudgetMax(e.target.value)}
        />
        <input
          className="input sm:max-w-56"
          placeholder="Plats (t.ex. Stockholm)"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Laddar…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-400">Inget att visa just nu.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((s) => (
            <Link key={s.id} href={`/sok/${s.id}`} className="card flex flex-col gap-2 hover:shadow-md">
              {s.image && <img src={s.image} alt="" className="h-36 w-full rounded-xl object-cover" />}
              <div className="flex items-center gap-2 text-sm font-semibold text-kungsbla-700">
                {s.user.name}
                {s.user.verified && <span className="badge-guld">✓</span>}
              </div>
              <p className="line-clamp-2 text-sm text-gray-600">{s.description}</p>
              <div className="mt-auto flex items-center justify-between text-xs text-gray-500">
                <span>{s.location}</span>
                {s.budgetMax && <span className="font-semibold text-kungsbla-600">max {s.budgetMax} kr</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
