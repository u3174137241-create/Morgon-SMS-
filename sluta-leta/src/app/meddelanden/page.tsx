"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCurrentUser } from "@/lib/useCurrentUser";

type TransactionListItem = {
  id: string;
  state: string;
  amount: number;
  contactFee: { status: string; amount: number } | null;
  buyer: { id: string; name: string };
  seller: { id: string; name: string };
  offer: { message: string; price: number };
};

const STATE_LABELS: Record<string, string> = {
  OFFER_ACCEPTED: "Godkänt",
  CONTACT_FEE_PENDING: "Väntar på betalning",
  PAYMENT_PROCESSING: "Behandlar betalning",
  PAYMENT_COMPLETED: "Betalning klar",
  CHAT_UNLOCKED: "Chatt upplåst",
  DEAL_IN_PROGRESS: "Affär pågår",
  WAITING_FOR_COMPLETION: "Väntar på bekräftelse",
  COMPLETED: "Genomförd",
  CANCELLED: "Avbruten",
  FAILED: "Misslyckades",
  DISPUTED: "Tvist",
};

export default function MessagesListPage() {
  const { user } = useCurrentUser();
  const [transactions, setTransactions] = useState<TransactionListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/transactions")
      .then((r) => r.json())
      .then((d) => setTransactions(d.transactions ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (user === null) {
    return <p className="text-sm text-gray-500">Logga in för att se dina meddelanden.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-kungsbla-700">Meddelanden</h1>
      {loading ? (
        <p className="text-sm text-gray-400">Laddar…</p>
      ) : transactions.length === 0 ? (
        <p className="text-sm text-gray-400">Inga affärer än.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {transactions.map((t) => {
            const other = user && t.buyer.id === user.id ? t.seller : t.buyer;
            return (
              <Link key={t.id} href={`/meddelanden/${t.id}`} className="card flex items-center justify-between hover:shadow-md">
                <div>
                  <p className="text-sm font-semibold text-kungsbla-700">{other.name}</p>
                  <p className="line-clamp-1 text-sm text-gray-500">{t.offer.message}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-kungsbla-600">{t.amount} kr</p>
                  <p className="text-xs text-gray-400">{STATE_LABELS[t.state] ?? t.state}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
