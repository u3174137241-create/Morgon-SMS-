"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useCurrentUser } from "@/lib/useCurrentUser";
import NotificationsBell from "@/app/components/NotificationsBell";
import { SkeletonGrid } from "@/app/components/Skeleton";

type SearchListItem = {
  id: string;
  title: string;
  description: string;
  type: "PRODUCT";
  budgetMax: number | null;
  location: string;
  image: string | null;
  offerCount: number;
  createdAt: string;
  user: { id: string; name: string; avatarUrl: string | null; verified: boolean };
};

type CategoryKey = "alla" | "fordon" | "djur" | "mode" | "elektronik";

const CATEGORY_KEYWORDS: Record<Exclude<CategoryKey, "alla">, string[]> = {
  fordon: ["bil", "bilar", "moped", "motorcykel", " mc ", "mc,", "cykel", "cyklar", "husbil", "husvagn", "bmw", "volvo", "audi", "skoda", "toyota"],
  djur: ["hund", "valp", "katt", "kattunge", "kanin", "fågel", "häst", "pomeranian", "bulldog", "chihuahua", "labrador"],
  mode: ["kläder", "jacka", "skor", "väska", "klänning", "byxor", "tröja", "mode", "kostym"],
  elektronik: ["iphone", "telefon", "mobil", "dator", "laptop", " tv ", "tv,", "elektronik", "samsung", "playstation", "surfplatta", "ipad"],
};

const CATEGORIES: { key: CategoryKey; label: string }[] = [
  { key: "alla", label: "Alla" },
  { key: "fordon", label: "Fordon" },
  { key: "djur", label: "Djur" },
  { key: "mode", label: "Mode" },
  { key: "elektronik", label: "Elektronik" },
];

function matchesCategory(item: SearchListItem, category: CategoryKey) {
  if (category === "alla") return true;
  const keywords = CATEGORY_KEYWORDS[category];
  const haystack = ` ${item.title} ${item.description} `.toLowerCase();
  return keywords.some((k) => haystack.includes(k));
}

function matchesQuery(item: SearchListItem, query: string) {
  if (!query.trim()) return true;
  const haystack = `${item.title} ${item.description}`.toLowerCase();
  return haystack.includes(query.trim().toLowerCase());
}

function formatTimestamp(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const time = d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === now.toDateString()) return `Idag ${time}`;
  return `${d.toLocaleDateString("sv-SE", { day: "numeric", month: "short" })} ${time}`;
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="h-4 w-4 flex-shrink-0">
      <circle cx="10.5" cy="10.5" r="6.5" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m20 20-4.3-4.3" />
    </svg>
  );
}

function SlidersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h10M17 7h3M4 17h3M10 17h10" />
      <circle cx="14" cy="7" r="2" />
      <circle cx="7" cy="17" r="2" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="h-3 w-3 flex-shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-6.5-5.8-6.5-10.5a6.5 6.5 0 0 1 13 0C18.5 15.2 12 21 12 21Z" />
      <circle cx="12" cy="10.5" r="2" />
    </svg>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      strokeWidth={1.8}
      stroke="currentColor"
      className={`h-4 w-4 ${filled ? "text-red-500" : "text-gray-400"}`}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 20s-7-4.5-9.5-9A5 5 0 0 1 12 6a5 5 0 0 1 9.5 5c-2.5 4.5-9.5 9-9.5 9Z"
      />
    </svg>
  );
}

function BrandMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="h-6 w-6 text-guld-500">
      <circle cx="10.5" cy="10.5" r="7" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m20.5 20.5-4.8-4.8" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10.5c0-1.4 1.1-2.5 2.5-2.5" />
    </svg>
  );
}

export default function HomePage() {
  const { user } = useCurrentUser();
  const [searches, setSearches] = useState<SearchListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryKey>("alla");
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

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

  const filtered = useMemo(
    () => searches.filter((s) => matchesCategory(s, category) && matchesQuery(s, query)),
    [searches, category, query]
  );

  const myListingsWithOffers = useMemo(
    () => (user ? searches.filter((s) => s.user.id === user.id && s.offerCount > 0) : []),
    [searches, user]
  );
  const myNewOffersCount = myListingsWithOffers.reduce((sum, s) => sum + s.offerCount, 0);

  function toggleLiked(id: string) {
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Identitetsrad, bara mobil — NavBar visar redan logga + profil på desktop */}
      <div className="flex items-center justify-between sm:hidden">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight text-kungsbla-700">
          <BrandMark />
          Sluta Leta
        </Link>
        <div className="flex items-center gap-3">
          {user && <NotificationsBell userId={user.id} />}
          <Link href={user ? `/profil/${user.id}` : "/logga-in"} aria-label="Min profil">
            {user ? (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-kungsbla-100 text-sm font-bold text-kungsbla-600">
                {user.name.charAt(0).toUpperCase()}
              </div>
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="h-5 w-5">
                  <circle cx="12" cy="8.5" r="3.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 20a7.5 7.5 0 0 1 15 0" />
                </svg>
              </div>
            )}
          </Link>
        </div>
      </div>

      {/* Sökfält + filter */}
      <div className="flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2.5">
          <SearchIcon />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Sök vad du söker…"
            aria-label="Sök bland sökningar"
            className="w-full flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
          />
        </div>
        <Link
          href="/sok"
          aria-label="Filtrera"
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 hover:border-kungsbla-400 hover:text-kungsbla-600"
        >
          <SlidersIcon />
        </Link>
      </div>

      {/* Kategorier */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setCategory(c.key)}
            className={`flex-shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${
              category === c.key
                ? "border-guld-400 bg-guld-400 text-white"
                : "border-gray-200 bg-white text-gray-600 hover:border-guld-400"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Hero-banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-kungsbla-700 via-kungsbla-600 to-guld-500 p-6 text-white shadow-sm">
        <div className="relative z-10 flex max-w-xs flex-col gap-3">
          <h1 className="text-2xl font-bold leading-tight">
            Sluta leta — lägg upp din annons redan idag och låt säljarna komma till dig!
          </h1>
          <Link
            href="/sok/ny"
            className="mt-1 w-fit rounded-full bg-white px-5 py-2 text-sm font-semibold text-kungsbla-700 shadow-sm"
          >
            Skapa annons →
          </Link>
        </div>
        <div className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-10 right-10 h-24 w-24 rounded-full bg-white/10" />
      </section>
      <p className="-mt-2 text-xs text-gray-400">✓ Gratis att söka</p>

      {myListingsWithOffers.length > 0 && myListingsWithOffers[0] && (
        <Link
          href={`/sok/${myListingsWithOffers[0].id}`}
          className="flex items-center gap-3 rounded-2xl border border-guld-400/40 bg-guld-400/10 p-3.5 transition hover:bg-guld-400/15"
        >
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-guld-400 text-sm font-bold text-white">
            {myNewOffersCount}
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-kungsbla-700">
              {myNewOffersCount === 1 ? "Du har 1 nytt erbjudande" : `Du har ${myNewOffersCount} nya erbjudanden`}
            </p>
            <p className="text-xs text-gray-500">
              På {myListingsWithOffers.length === 1 ? "din annons" : `${myListingsWithOffers.length} av dina annonser`} — tryck för att se
            </p>
          </div>
          <span className="text-kungsbla-600">→</span>
        </Link>
      )}

      {/* Annonser (sökningar) */}
      <section>
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-bold text-kungsbla-700">Nya annonser</h2>
          <Link href="/utforska" className="text-sm font-semibold text-guld-600 hover:underline">
            Se alla →
          </Link>
        </div>
        <Link href="/hitta-kopare" className="mb-3 inline-block text-xs font-medium text-kungsbla-600 hover:underline">
          Säljare? Hitta köpare →
        </Link>

        {loading ? (
          <SkeletonGrid count={4} />
        ) : error ? (
          <div className="flex flex-col items-center gap-1 py-16 text-center">
            <p className="text-sm font-medium text-gray-500">Något gick fel.</p>
            <p className="text-xs text-gray-400">Vi kunde inte hämta annonserna just nu.</p>
            <button className="btn-secondary mt-3 !px-5 !py-2 text-xs" onClick={load}>
              Försök igen
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-1 py-16 text-center">
            <p className="text-sm font-medium text-gray-500">
              {searches.length === 0 ? "Ingen söker efter något just nu." : "Inga annonser matchar din sökning."}
            </p>
            <p className="text-xs text-gray-400">Nya annonser visas här när personer börjar leta.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((s) => (
              <Link key={s.id} href={`/sok/${s.id}`} className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="relative aspect-square w-full bg-gray-100">
                  {s.image ? (
                    <img src={s.image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-kungsbla-50 to-guld-400/10 text-xs text-gray-400">
                      Ingen bild
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      toggleLiked(s.id);
                    }}
                    aria-label="Spara"
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 shadow-sm"
                  >
                    <HeartIcon filled={likedIds.has(s.id)} />
                  </button>
                </div>
                <div className="flex flex-1 flex-col gap-0.5 p-2.5">
                  <div className="flex items-center gap-1 text-[11px] text-gray-400">
                    <PinIcon />
                    <span className="line-clamp-1">{s.location}</span>
                  </div>
                  <p className="line-clamp-2 text-xs font-medium text-gray-700">{s.title}</p>
                  <div className="mt-auto flex items-center justify-between pt-1">
                    {s.budgetMax ? (
                      <span className="text-sm font-bold text-kungsbla-700">max {s.budgetMax} kr</span>
                    ) : (
                      <span className="text-xs text-gray-400">{s.offerCount} erbjudanden</span>
                    )}
                    <span className="text-[10px] text-gray-400">{formatTimestamp(s.createdAt)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
