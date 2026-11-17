"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { SkeletonList } from "@/app/components/Skeleton";

type TransactionListItem = {
  id: string;
  state: string;
  amount: number;
  updatedAt: string;
  contactFee: { status: string; amount: number } | null;
  buyer: { id: string; name: string };
  seller: { id: string; name: string };
  offer: { message: string; price: number };
};

const CHAT_LOCKED_STATES = new Set(["CONTACT_FEE_PENDING", "PAYMENT_PROCESSING", "FAILED"]);

function relativeTime(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Nu";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} tim`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} dygn`;
  return new Date(dateStr).toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
}

export default function MessagesListPage() {
  const { user } = useCurrentUser();
  const [transactions, setTransactions] = useState<TransactionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  function load() {
    setLoading(true);
    setError(false);
    fetch("/api/transactions")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => setTransactions(d.transactions ?? []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  if (user === null) {
    return <p className="text-sm text-gray-500">Logga in för att se dina meddelanden.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-kungsbla-700">Meddelanden</h1>
      {loading ? (
        <SkeletonList count={4} />
      ) : error ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <p className="text-sm font-medium text-gray-500">Något gick fel.</p>
          <p className="text-xs text-gray-400">Vi kunde inte hämta dina meddelanden just nu.</p>
          <button className="btn-secondary mt-2 !px-5 !py-2 text-xs" onClick={load}>
            Försök igen
          </button>
        </div>
      ) : transactions.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor" className="h-10 w-10 text-gray-300">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9A1.5 1.5 0 0 1 18.5 16H9l-4 4v-4H5.5A1.5 1.5 0 0 1 4 14.5v-9Z" />
          </svg>
          <p className="text-sm font-medium text-gray-500">Inga meddelanden ännu.</p>
          <p className="max-w-xs text-xs text-gray-400">
            Här hamnar konversationen så fort du accepterar ett erbjudande, eller ett erbjudande du
            lämnat blir accepterat.
          </p>
          {user && (
            <Link href={`/profil/${user.id}`} className="btn-primary mt-2 !px-5 !py-2 text-xs">
              Mina sökningar
            </Link>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {transactions.map((t) => {
            const other = user && t.buyer.id === user.id ? t.seller : t.buyer;
            const locked = CHAT_LOCKED_STATES.has(t.state);
            return (
              <Link key={t.id} href={`/meddelanden/${t.id}`} className="card flex items-center gap-3 hover:shadow-md">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-kungsbla-100 text-sm font-bold text-kungsbla-600">
                  {other.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 text-sm font-semibold text-kungsbla-700">
                    {other.name}
                    <span aria-hidden className="text-xs">
                      {locked ? "🔒" : "🔓"}
                    </span>
                  </p>
                  <p className="line-clamp-1 text-sm text-gray-500">{t.offer.message}</p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-sm font-bold text-kungsbla-600">{t.amount} kr</p>
                  <p className="text-xs text-gray-400">{relativeTime(t.updatedAt)}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
