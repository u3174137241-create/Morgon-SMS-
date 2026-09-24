"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Notification = {
  id: string;
  type: string;
  payload: { searchId?: string; transactionId?: string; title?: string; amount?: number };
  readAt: string | null;
  createdAt: string;
};

const LABELS: Record<string, (n: Notification) => string> = {
  NEW_OFFER: () => "Du har fått ett nytt erbjudande",
  OFFER_ACCEPTED: () => "Ditt erbjudande godkändes",
  CONTACT_FEE_REQUIRED: (n) => `Betala kontaktavgift (${n.payload.amount ?? ""} kr) för att låsa upp chatten`,
  PAYMENT_COMPLETED: () => "Betalning genomförd",
  CHAT_UNLOCKED: () => "Chatten är upplåst",
  NEW_MATCH: (n) => `Ny sökning matchar det du säljer: ${n.payload.title ?? ""}`,
  TRANSACTION_UPDATED: () => "En affär har uppdaterats",
};

function linkFor(n: Notification): string {
  if (n.payload.transactionId) return `/meddelanden/${n.payload.transactionId}`;
  if (n.payload.searchId) return `/sok/${n.payload.searchId}`;
  return "/meddelanden";
}

export default function NotificationsBell({ userId }: { userId: string | null }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!userId) return;
    const load = () =>
      fetch("/api/notifications")
        .then((r) => r.json())
        .then((d) => setNotifications(d.notifications ?? []));
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [userId]);

  if (!userId) return null;
  const unreadCount = notifications.filter((n) => !n.readAt).length;

  async function toggle() {
    setOpen((o) => !o);
    if (!open && unreadCount > 0) {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    }
  }

  return (
    <div className="relative">
      <button onClick={toggle} className="relative rounded-full p-1.5 text-kungsbla-600 hover:bg-kungsbla-50" aria-label="Notiser">
        🔔
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-guld-500 text-[10px] font-bold text-white">
            {unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-72 rounded-xl border border-gray-100 bg-white p-2 shadow-lg">
          {notifications.length === 0 ? (
            <p className="p-3 text-sm text-gray-400">Inga notiser än.</p>
          ) : (
            <div className="flex max-h-80 flex-col gap-1 overflow-y-auto">
              {notifications.map((n) => (
                <Link
                  key={n.id}
                  href={linkFor(n)}
                  onClick={() => setOpen(false)}
                  className={`rounded-lg px-3 py-2 text-sm hover:bg-kungsbla-50 ${!n.readAt ? "font-semibold text-kungsbla-700" : "text-gray-500"}`}
                >
                  {(LABELS[n.type]?.(n) ?? n.type)}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
