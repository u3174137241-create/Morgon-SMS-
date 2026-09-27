"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type SearchListItem = {
  id: string;
  title: string;
  description: string;
  type: "PRODUCT";
  budgetMax: number | null;
  location: string;
  image: string | null;
  offerCount: number;
  user: { id: string; name: string; avatarUrl: string | null; verified: boolean };
};

function CompassIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
      <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.8 9.2-1.9 5-5 1.9 1.9-5 5-1.9Z" />
    </svg>
  );
}

export default function HomePage() {
  const [searches, setSearches] = useState<SearchListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  function load() {
    setLoading(true);
    setError(false);
    fetch("/api/searches")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => setSearches(d.searches ?? []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col items-center gap-3 py-4 text-center">
        <p className="text-xs font-bold uppercase tracking-wider text-guld-600">Sluta Leta</p>
        <h1 className="text-3xl font-bold text-gray-900">Sluta leta. Låt säljare hitta dig.</h1>
        <p className="max-w-xs text-sm text-gray-500">
          Skriv vad du vill köpa och till vilket pris. Säljare som har det hör av sig direkt till
          dig — du slipper leta själv. Helt gratis för dig som köpare.
        </p>

        <div className="mt-3 flex w-full max-w-sm flex-col gap-3">
          <Link href="/sok/ny" className="btn-primary w-full">
            + Jag söker
          </Link>
          <Link
            href="/utforska"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-guld-400 bg-guld-400/10 px-5 py-2.5 text-sm font-semibold text-guld-600 transition hover:bg-guld-400/20"
          >
            <CompassIcon />
            Se sökningar
          </Link>
        </div>
        <p className="mt-1 text-xs text-gray-400">
          ✓ Gratis att söka · ✓ Ingen köptvång · ✓ Du väljer själv
        </p>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { step: "1", title: "Skriv vad du söker", text: "T.ex. ”en cykel, max 1000 kr, Stockholm”." },
          { step: "2", title: "Säljare hör av sig", text: "De som har det du letar efter skickar ett erbjudande till dig." },
          { step: "3", title: "Du väljer", text: "Ingen köptvång. Du väljer själv det erbjudande som passar dig bäst." },
        ].map((s) => (
          <div key={s.step} className="card flex flex-col gap-1">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-kungsbla-50 text-xs font-bold text-kungsbla-600">
              {s.step}
            </span>
            <p className="text-sm font-semibold text-kungsbla-700">{s.title}</p>
            <p className="text-xs text-gray-500">{s.text}</p>
          </div>
        ))}
      </section>

      <section className="card flex flex-col gap-3">
        <h2 className="text-sm font-bold text-kungsbla-700">Så fungerar det</h2>
        <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:justify-center sm:gap-4 sm:text-left">
          <div className="rounded-xl bg-kungsbla-50 px-4 py-3">
            <p className="text-sm font-semibold text-kungsbla-700">🚲 Elcykel</p>
            <p className="text-xs text-gray-600">Stockholm · Max 8 000 kr</p>
          </div>
          <span className="text-lg text-gray-300">↓</span>
          <div className="rounded-xl bg-guld-400/10 px-4 py-3">
            <p className="text-sm text-gray-700">”Jag har en Crescent elcykel som passar.”</p>
            <p className="text-sm font-bold text-guld-600">7 500 kr</p>
          </div>
          <span className="text-lg text-gray-300 sm:hidden">↓</span>
        </div>
        <p className="text-center text-xs text-gray-400 sm:text-left">Du jämför erbjudanden som kommer in och väljer själv.</p>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-kungsbla-700">Sökes just nu</h2>
          <Link href="/hitta-kopare" className="text-sm font-semibold text-guld-600 hover:underline">
            Säljare? Hitta köpare →
          </Link>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400">Laddar…</p>
        ) : error ? (
          <div className="flex flex-col items-center gap-1 py-16 text-center">
            <p className="text-sm font-medium text-gray-500">Något gick fel.</p>
            <p className="text-xs text-gray-400">Vi kunde inte hämta sökningarna just nu.</p>
            <button className="btn-secondary mt-3 !px-5 !py-2 text-xs" onClick={load}>
              Försök igen
            </button>
          </div>
        ) : searches.length === 0 ? (
          <div className="flex flex-col items-center gap-1 py-16 text-center">
            <p className="text-sm font-medium text-gray-500">Ingen söker efter något just nu</p>
            <p className="text-xs text-gray-400">Nya sökningar visas här när personer börjar leta.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {searches.map((s) => (
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
                <div className="flex items-center justify-between">
                  <span className="text-xs text-guld-600">{s.offerCount} erbjudanden</span>
                  <span className="text-xs font-semibold text-kungsbla-600">Lämna erbjudande →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
