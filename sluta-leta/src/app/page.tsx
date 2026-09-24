"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type SearchListItem = {
  id: string;
  title: string;
  description: string;
  type: "PRODUCT" | "SERVICE";
  budgetMax: number | null;
  location: string;
  image: string | null;
  offerCount: number;
  user: { id: string; name: string; avatarUrl: string | null; verified: boolean };
};

export default function HomePage() {
  const router = useRouter();
  const [describeText, setDescribeText] = useState("");
  const [internalQuery, setInternalQuery] = useState("");
  const [searches, setSearches] = useState<SearchListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/searches")
      .then((r) => r.json())
      .then((d) => setSearches(d.searches ?? []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!internalQuery.trim()) return searches;
    const q = internalQuery.toLowerCase();
    return searches.filter((s) => s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q));
  }, [searches, internalQuery]);

  function goCreateSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams({ text: describeText });
    router.push(`/sok?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-12">
      <section className="flex flex-col items-center gap-4 py-8 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-kungsbla-700 sm:text-5xl">Sluta Leta</h1>
        <p className="max-w-xl text-lg font-medium text-kungsbla-500">
          Sluta leta. Låt säljarna hitta dig.
        </p>
        <p className="max-w-xl text-sm text-gray-500">
          Beskriv vad du söker eller lägg in en bild. Vi matchar dig med säljare som har det du letar
          efter — så att du slipper leta själv.
        </p>

        <form onSubmit={goCreateSearch} className="mt-4 flex w-full max-w-xl flex-col gap-3 sm:flex-row">
          <input
            className="input"
            placeholder="T.ex. 'Jag söker en iPhone 15 Pro, max 7000 kr, Stockholm'"
            value={describeText}
            onChange={(e) => setDescribeText(e.target.value)}
          />
          <button className="btn-primary whitespace-nowrap" type="submit">
            Skapa sökning — gratis
          </button>
        </form>

        <div className="mt-2 w-full max-w-xl">
          <input
            className="input"
            placeholder="Sök efter vad som helst…"
            value={internalQuery}
            onChange={(e) => setInternalQuery(e.target.value)}
          />
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-kungsbla-700">Sökes just nu</h2>
          <Link href="/hitta-kopare" className="text-sm font-semibold text-guld-500 hover:underline">
            Säljare? Hitta köpare →
          </Link>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400">Laddar…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-gray-400">Inga aktiva sökningar just nu.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((s) => (
              <Link key={s.id} href={`/sok/${s.id}`} className="card flex flex-col gap-2 hover:shadow-md">
                {s.image && (
                  <img src={s.image} alt="" className="h-36 w-full rounded-xl object-cover" />
                )}
                <div className="flex items-center gap-2 text-sm font-semibold text-kungsbla-700">
                  {s.user.name}
                  {s.user.verified && <span className="badge-guld">✓ Verifierad</span>}
                </div>
                <p className="line-clamp-2 text-sm text-gray-600">{s.description}</p>
                <div className="mt-auto flex items-center justify-between text-xs text-gray-500">
                  <span>{s.location}</span>
                  {s.budgetMax && <span className="font-semibold text-kungsbla-600">max {s.budgetMax} kr</span>}
                </div>
                <span className="text-xs text-guld-500">{s.offerCount} erbjudanden</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
