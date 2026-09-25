"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useCurrentUser } from "@/lib/useCurrentUser";

type Profile = {
  id: string;
  name: string;
  avatarUrl: string | null;
  verified: boolean;
  ratingAvg: number | null;
  ratingCount: number;
  dealsCompleted: number;
  createdAt: string;
};

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  author: { name: string; avatarUrl: string | null };
};

type ActiveSearch = { id: string; title: string; budgetMax: number | null; location: string; status: string };

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth={2}
      stroke="currentColor"
      className={`h-4 w-4 flex-shrink-0 text-gray-300 transition-transform ${open ? "rotate-90" : ""}`}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 6 6 6-6 6" />
    </svg>
  );
}

function MenuRow({
  icon,
  title,
  subtitle,
  badge,
  onClick,
  open,
  expandable,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  badge?: string;
  onClick?: () => void;
  open?: boolean;
  expandable?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="card flex w-full items-center gap-3 text-left disabled:cursor-default"
    >
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-kungsbla-50 text-kungsbla-600">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-kungsbla-700">{title}</p>
        <p className="line-clamp-1 text-xs text-gray-400">{subtitle}</p>
      </div>
      {badge && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">{badge}</span>}
      {expandable && <ChevronIcon open={Boolean(open)} />}
    </button>
  );
}

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, refresh } = useCurrentUser();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activeSearches, setActiveSearches] = useState<ActiveSearch[]>([]);
  const [searchCount, setSearchCount] = useState(0);
  const [offerCount, setOfferCount] = useState(0);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [openSection, setOpenSection] = useState<"sokningar" | "integritet" | "hjalp" | null>(null);

  useEffect(() => {
    fetch(`/api/users/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setProfile(d.profile);
        setReviews(d.reviews ?? []);
        setActiveSearches(d.activeSearches ?? []);
        setSearchCount(d.searchCount ?? 0);
        setOfferCount(d.offerCount ?? 0);
      });
  }, [id]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    await refresh();
    router.push("/");
  }

  async function deleteAccount() {
    await fetch("/api/auth/me", { method: "DELETE" });
    await refresh();
    router.push("/");
  }

  if (!profile) return <p className="text-sm text-gray-400">Laddar…</p>;
  const isSelf = user?.id === profile.id;

  function toggle(section: "sokningar" | "integritet" | "hjalp") {
    setOpenSection((s) => (s === section ? null : section));
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div className="card flex flex-col items-center gap-3 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-kungsbla-100 text-xl font-bold text-kungsbla-600">
          {profile.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="flex items-center justify-center gap-2 text-lg font-bold text-kungsbla-700">
            {profile.name}
            {profile.verified && <span className="badge-guld">✓ Verifierad</span>}
          </div>
          {isSelf && user?.email && <p className="text-xs text-gray-400">{user.email}</p>}
        </div>
        <div className="mt-1 grid w-full grid-cols-3 divide-x divide-gray-100 border-t border-gray-100 pt-3">
          <div>
            <p className="text-lg font-bold text-kungsbla-700">{searchCount}</p>
            <p className="text-xs text-gray-400">Efterlysningar</p>
          </div>
          <div>
            <p className="text-lg font-bold text-kungsbla-700">{offerCount}</p>
            <p className="text-xs text-gray-400">Erbjudanden</p>
          </div>
          <div>
            <p className="text-lg font-bold text-kungsbla-700">{profile.ratingCount > 0 ? profile.ratingAvg : "—"}</p>
            <p className="text-xs text-gray-400">Betyg</p>
          </div>
        </div>
      </div>

      {isSelf && !user?.isPlus && (
        <div className="flex flex-col gap-3 rounded-2xl bg-gradient-to-br from-guld-400 to-guld-500 p-5 text-white shadow-sm">
          <div className="flex items-center gap-2 text-base font-bold">
            <span aria-hidden>★</span> Sluta Leta Plus
          </div>
          <p className="text-sm text-white/90">99 kr/mån — inga kontaktavgifter, alla säljarfunktioner</p>
          <Link href="/plus" className="w-fit rounded-full bg-white px-5 py-2 text-sm font-semibold text-guld-500">
            Aktivera Plus
          </Link>
        </div>
      )}
      {isSelf && user?.isPlus && (
        <div className="flex items-center justify-between rounded-2xl bg-guld-400/15 p-4 text-sm font-semibold text-guld-500">
          <span>★ Du har Sluta Leta Plus</span>
          <Link href="/plus" className="text-xs font-medium underline">
            Hantera
          </Link>
        </div>
      )}

      {isSelf && (
        <div className="flex flex-col gap-2">
          <MenuRow
            icon={
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
                <circle cx="10.5" cy="10.5" r="6" strokeLinecap="round" strokeLinejoin="round" />
                <path strokeLinecap="round" strokeLinejoin="round" d="m19 19-4-4" />
              </svg>
            }
            title="Mina sökningar"
            subtitle="Hantera vad du letar efter"
            expandable
            open={openSection === "sokningar"}
            onClick={() => toggle("sokningar")}
          />
          {openSection === "sokningar" && (
            <div className="flex flex-col gap-2 pl-2">
              {activeSearches.length === 0 ? (
                <p className="px-2 text-xs text-gray-400">Inga aktiva sökningar just nu.</p>
              ) : (
                activeSearches.map((s) => (
                  <Link key={s.id} href={`/sok/${s.id}`} className="card flex items-center justify-between hover:shadow-md">
                    <div>
                      <p className="line-clamp-1 text-sm font-medium text-kungsbla-700">{s.title}</p>
                      <p className="text-xs text-gray-400">
                        {s.location} {s.budgetMax ? `· max ${s.budgetMax} kr` : ""} {s.status === "PAUSED" ? "· Pausad" : ""}
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          )}

          <MenuRow
            icon={
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
                <rect x="3" y="8" width="18" height="11" rx="2" strokeLinecap="round" strokeLinejoin="round" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            }
            title="Mina affärer"
            subtitle="Kontaktavgifter & genomförda köp"
            onClick={() => router.push("/meddelanden")}
          />

          <MenuRow
            icon={
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4a4 4 0 0 0-4 4v2.5c0 1-.4 2-1 2.7l-.8.9c-.5.6-.1 1.4.7 1.4h10.2c.8 0 1.2-.8.7-1.4l-.8-.9c-.6-.7-1-1.7-1-2.7V8a4 4 0 0 0-4-4Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 18.5a2 2 0 0 0 4 0" />
              </svg>
            }
            title="Notisinställningar"
            subtitle="Du får redan notiser i klockan ovan"
            badge="Snart"
          />

          <MenuRow
            icon={
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.5 5 6.3v5.2c0 4.3 3 7.8 7 8.9 4-1.1 7-4.6 7-8.9V6.3L12 3.5Z" />
              </svg>
            }
            title="Integritet & säkerhet"
            subtitle="Exportera eller radera ditt konto"
            expandable
            open={openSection === "integritet"}
            onClick={() => toggle("integritet")}
          />
          {openSection === "integritet" && (
            <div className="card flex flex-col gap-3">
              <a href="/api/auth/export" className="btn-secondary w-fit !px-3 !py-1.5 text-xs">
                Exportera mina uppgifter
              </a>
              {!confirmingDelete ? (
                <button className="w-fit text-xs font-medium text-red-600 underline" onClick={() => setConfirmingDelete(true)}>
                  Radera mitt konto
                </button>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-red-600">Är du säker? Detta går inte att ångra.</span>
                  <button className="text-xs font-bold text-red-600 underline" onClick={deleteAccount}>
                    Ja, radera
                  </button>
                  <button className="text-xs text-gray-400 underline" onClick={() => setConfirmingDelete(false)}>
                    Avbryt
                  </button>
                </div>
              )}
            </div>
          )}

          <MenuRow
            icon={
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
                <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 9.3a2.5 2.5 0 1 1 3.6 2.2c-.8.4-1.1.9-1.1 1.8" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 17h.01" />
              </svg>
            }
            title="Hjälp & support"
            subtitle="Frågor eller problem med en affär"
            expandable
            open={openSection === "hjalp"}
            onClick={() => toggle("hjalp")}
          />
          {openSection === "hjalp" && (
            <div className="card text-xs text-gray-500">
              Mejla oss på{" "}
              <a href="mailto:hjalp@slutaleta.se" className="font-medium text-kungsbla-600 underline">
                hjalp@slutaleta.se
              </a>{" "}
              så svarar vi så snart vi kan.
            </div>
          )}
        </div>
      )}

      <div>
        <h2 className="mb-3 text-lg font-bold text-kungsbla-700">Recensioner</h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-gray-400">Inga recensioner än.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {reviews.map((r) => (
              <div key={r.id} className="card">
                <p className="text-sm font-semibold text-kungsbla-700">
                  {r.author.name} · {r.rating} ★
                </p>
                {r.comment && <p className="text-sm text-gray-600">{r.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {isSelf && (
        <button
          className="w-full rounded-full border border-red-200 px-5 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
          onClick={logout}
        >
          Logga ut
        </button>
      )}

      <p className="pb-2 text-center text-xs text-gray-300">Sluta Leta · säljaren betalar kontaktavgift</p>
    </div>
  );
}
