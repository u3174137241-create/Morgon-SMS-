"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
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
  const [loadError, setLoadError] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    setNeedsLogin(false);
    fetch("/api/subscriptions/me")
      .then((r) => {
        if (r.status === 401) {
          setNeedsLogin(true);
          throw new Error("not-logged-in");
        }
        if (!r.ok) throw new Error("request-failed");
        return r.json();
      })
      .then((d) => {
        setSubscription(d.subscription);
        setStripeConfigured(d.stripeConfigured);
      })
      .catch((err) => {
        if (err.message !== "not-logged-in") setLoadError(true);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function subscribe() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/subscriptions/checkout", { method: "POST" });
      const data = await res.json();
      if (!res.ok) return setError(data.error);
      window.location.href = data.checkoutUrl;
    } catch {
      setError("Kunde inte nå servern. Kontrollera din uppkoppling och försök igen.");
    } finally {
      setSubmitting(false);
    }
  }

  async function manage() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/subscriptions/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) return setError(data.error);
      window.location.href = data.portalUrl;
    } catch {
      setError("Kunde inte nå servern. Kontrollera din uppkoppling och försök igen.");
    } finally {
      setSubmitting(false);
    }
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
        <p>✓ Inget tak på hur många affärer du gör</p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Laddar…</p>
      ) : needsLogin ? (
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-gray-500">Du måste logga in för att bli Plus-medlem.</p>
          <Link href="/logga-in" className="btn-primary">
            Logga in
          </Link>
        </div>
      ) : loadError ? (
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-red-600">Kunde inte hämta din prenumeration just nu.</p>
          <button className="btn-secondary" onClick={load}>
            Försök igen
          </button>
        </div>
      ) : !stripeConfigured ? (
        <p className="text-sm text-gray-400">Betalningar är inte konfigurerade ännu.</p>
      ) : isActive ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-kungsbla-600">
            Din prenumeration är aktiv{subscription?.cancelAtPeriodEnd ? " (avslutas vid periodens slut)" : ""}.
          </p>
          <button className="btn-secondary w-fit self-center disabled:opacity-50" onClick={manage} disabled={submitting}>
            {submitting ? "Öppnar…" : "Hantera prenumeration"}
          </button>
        </div>
      ) : (
        <button className="btn-primary self-center disabled:opacity-50" onClick={subscribe} disabled={submitting}>
          {submitting ? "Öppnar betalning…" : `Bli Plus-medlem — ${PLUS_MONTHLY_PRICE_SEK} kr/mån`}
        </button>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
