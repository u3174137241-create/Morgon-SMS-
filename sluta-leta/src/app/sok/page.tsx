"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type SearchListItem = {
  id: string;
  title: string;
  description: string;
  location: string;
  budgetMax: number | null;
  user: { name: string; verified: boolean };
};

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<SearchListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  function load() {
    setLoading(true);
    setError(false);
    fetch("/api/searches")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => setItems(d.searches ?? []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const timeout = setTimeout(load, 200);
    return () => clearTimeout(timeout);
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? items.filter((s) => s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || s.location.toLowerCase().includes(q))
    : items;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-kungsbla-700">Sök bland önskemål</h1>
        <p className="mt-1 text-sm text-gray-500">
          Har du något att sälja? Sök på nyckelord för att snabbt hitta personer som redan letar
          efter just det.
        </p>
      </div>
      <input
        className="input"
        placeholder="T.ex. cykel, iPhone, Stockholm…"
        aria-label="Sök bland önskemål"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <Link href="/sok/ny" className="btn-primary w-fit !px-5 !py-2 text-xs">
        + Söker du själv något? Skapa en sökning
      </Link>

      {loading ? (
        <p className="text-sm text-gray-400">Laddar…</p>
      ) : error ? (
        <div className="flex flex-col items-center gap-1 py-12 text-center">
          <p className="text-sm font-medium text-gray-500">Något gick fel.</p>
          <p className="text-xs text-gray-400">Vi kunde inte hämta sökningarna just nu.</p>
          <button className="btn-secondary mt-2 !px-5 !py-2 text-xs" onClick={load}>
            Försök igen
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-1 py-12 text-center">
          <p className="text-sm font-medium text-gray-500">Inga träffar</p>
          <p className="text-xs text-gray-400">
            {q ? "Inget matchade din sökning just nu." : "Ingen söker efter något just nu."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((s) => (
            <Link key={s.id} href={`/sok/${s.id}`} className="card flex items-center justify-between hover:shadow-md">
              <div>
                <p className="line-clamp-1 text-sm font-medium text-kungsbla-700">{s.title}</p>
                <p className="text-xs text-gray-400">
                  {s.location} {s.budgetMax ? `· max ${s.budgetMax} kr` : ""}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
