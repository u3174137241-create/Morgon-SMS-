"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { OFFER_STATUS_LABELS } from "@/lib/transactionLabels";

type MyOffer = {
  id: string;
  price: number;
  shippingCost: number | null;
  estimatedDeliveryDays: number | null;
  savedByBuyerAt: string | null;
  message: string;
  status: string;
  createdAt: string;
  search: { id: string; title: string; status: string; expiresAt: string } | null;
};

export default function MyOffersPage() {
  const [offers, setOffers] = useState<MyOffer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/offers/mine");
      const data = await res.json();
      if (!res.ok) return setError(data.error ?? "Något gick fel.");
      setOffers(data.offers);
    } catch {
      setError("Vi kunde inte hämta dina erbjudanden just nu.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function withdraw(offerId: string) {
    setActionMessage(null);
    const res = await fetch(`/api/offers/${offerId}/withdraw`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setActionMessage(data.error ?? "Något gick fel.");
    load();
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <p className="text-sm font-medium text-gray-500">Något gick fel.</p>
        <p className="text-xs text-gray-400">{error}</p>
        <button className="btn-secondary mt-2 !px-5 !py-2 text-xs" onClick={load}>
          Försök igen
        </button>
      </div>
    );
  }
  if (!offers) return <p className="text-sm text-gray-400">Laddar…</p>;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-kungsbla-700">Mina erbjudanden</h1>
        <p className="text-sm text-gray-500">Alla erbjudanden du har lämnat, och vad som hänt med dem.</p>
      </div>

      {actionMessage && <p className="text-sm text-red-600">{actionMessage}</p>}

      {offers.length === 0 ? (
        <p className="text-sm text-gray-400">
          Du har inte lämnat några erbjudanden än. Kika på{" "}
          <Link href="/sok" className="font-medium text-kungsbla-600 hover:underline">
            Sök
          </Link>{" "}
          eller{" "}
          <Link href="/hitta-kopare" className="font-medium text-kungsbla-600 hover:underline">
            Hitta köpare
          </Link>
          .
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {offers.map((offer) => (
            <div key={offer.id} className="card flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Link
                  href={offer.search ? `/sok/${offer.search.id}` : "#"}
                  className="text-sm font-semibold text-kungsbla-700 hover:underline"
                >
                  {offer.search?.title ?? "Sökning borttagen"}
                </Link>
                <span className="text-xs font-medium text-gray-400">{OFFER_STATUS_LABELS[offer.status] ?? offer.status}</span>
              </div>
              <p className="text-sm text-gray-700">{offer.message}</p>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-kungsbla-600">
                  {offer.price} kr
                  {offer.shippingCost != null && offer.shippingCost > 0 && (
                    <span className="ml-1 text-xs font-normal text-gray-400">+ {offer.shippingCost} kr frakt</span>
                  )}
                </span>
                {["SENT", "VIEWED"].includes(offer.status) && (
                  <button className="btn-secondary !px-3 !py-1.5 text-xs" onClick={() => withdraw(offer.id)}>
                    Återkalla
                  </button>
                )}
              </div>
              {offer.savedByBuyerAt && <p className="text-xs text-guld-600">★ Köparen har sparat ditt erbjudande</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
