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

  useEffect(() => {
    setLoading(true);
    const timeout = setTimeout(() => {
      fetch("/api/searches")
        .then((r) => r.json())
        .then((d) => setItems(d.searches ?? []))
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(timeout);
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? items.filter((s) => s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || s.location.toLowerCase().includes(q))
    : items;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <h1 className="text-2xl font-bold text-kungsbla-700">Sök</h1>
      <input
        className="input"
        placeholder="Sök bland sökningar…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <p className="text-xs text-gray-400">
        Sökning letar bara bland befintliga efterlysningar. Vill du skapa en egen? Gå till{" "}
        <Link href="/" className="font-medium text-kungsbla-600 hover:underline">
          Hem
        </Link>
        .
      </p>

      {loading ? (
        <p className="text-sm text-gray-400">Laddar…</p>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-1 py-12 text-center">
          <p className="text-sm font-medium text-gray-500">Inga sökningar</p>
          <p className="text-xs text-gray-400">
            {q ? "Inget matchade din sökning." : "Bli först att publicera vad du letar efter."}
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
