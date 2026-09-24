"use client";

import { useEffect, useState } from "react";
import { PLUS_MONTHLY_PRICE_SEK } from "@/lib/fees";

type Subscription = {
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
} | null;

export default function PlusPage() {
  const [subscription, setSubscription] = useState<Subscription>(null);
  const [stripeConfigured, setStripeConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/subscriptions/me")
      .then((r) => r.json())
      .then((d) => {
        setSubscription(d.subscription);
        setStripeConfigured(d.stripeConfigured);
      })
      .finally(() => setLoading(false));
  }, []);

  async function subscribe() {
    setError(null);
    const res = await fetch("/api/subscriptions/checkout", { method: "POST" });
    const data = await res.json();
    if (!res.ok) return setError(data.error);
    window.location.href = data.checkoutUrl;
  }

  async function manage() {
    setError(null);
    const res = await fetch("/api/subscriptions/portal", { method: "POST" });
    const data = await res.json();
    if (!res.ok) return setError(data.error);
    window.location.href = data.portalUrl;
  }

  const isActive = subscription && ["ACTIVE", "CANCEL_AT_PERIOD_END"].includes(subscription.status);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 text-center">
      <h1 className="text-2xl font-bold text-kungsbla-700">Sluta Leta Plus</h1>
      <p className="text-sm text-gray-500">
        Slipp kontaktavgiften helt. {PLUS_MONTHLY_PRICE_SEK} kr/månad, avsluta när du vill.
      </p>

      <div className="card flex flex-col gap-2 text-left text-sm text-gray-700">
        <p>✓ 0 kr kontaktavgift på alla affärer</p>
        <p>✓ Full tillgång till Hitta köpare</p>
        <p>✓ Obegränsat antal legitima kontaktupplåsningar</p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Laddar…</p>
      ) : !stripeConfigured ? (
        <p className="text-sm text-gray-400">Betalningar är inte konfigurerade ännu.</p>
      ) : isActive ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-kungsbla-600">
            Din prenumeration är aktiv{subscription?.cancelAtPeriodEnd ? " (avslutas vid periodens slut)" : ""}.
          </p>
          <button className="btn-secondary w-fit self-center" onClick={manage}>
            Hantera prenumeration
          </button>
        </div>
      ) : (
        <button className="btn-primary self-center" onClick={subscribe}>
          Bli Plus-medlem — {PLUS_MONTHLY_PRICE_SEK} kr/mån
        </button>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
