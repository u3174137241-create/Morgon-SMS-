"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCurrentUser } from "@/lib/useCurrentUser";
import ImageUploader from "@/app/components/ImageUploader";

type Offer = {
  id: string;
  price: number;
  message: string;
  status: string;
  images: { url: string }[];
  seller: {
    id: string;
    name: string;
    avatarUrl: string | null;
    emailVerifiedAt: string | null;
    ratingSum: number;
    ratingCount: number;
    dealsCompleted: number;
  };
};

type SearchDetail = {
  id: string;
  title: string;
  description: string;
  budgetMax: number | null;
  location: string;
  status: string;
  images: { url: string }[];
  user: { id: string; name: string };
  offers: Offer[];
};

function SearchDetailContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const notifiedSellers = Number(searchParams.get("notified")) || 0;
  const { user } = useCurrentUser();
  const [search, setSearch] = useState<SearchDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [offerPrice, setOfferPrice] = useState("");
  const [offerMessage, setOfferMessage] = useState("");
  const [offerImages, setOfferImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/searches/${id}`);
    const data = await res.json();
    if (!res.ok) return setError(data.error);
    setSearch(data.search);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function submitOffer(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setActionMessage(null);
    const res = await fetch("/api/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ searchId: id, price: Number(offerPrice), message: offerMessage, images: offerImages }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) return setActionMessage(data.error);
    setOfferPrice("");
    setOfferMessage("");
    setOfferImages([]);
    load();
  }

  async function acceptOffer(offerId: string) {
    setActionMessage(null);
    const res = await fetch(`/api/offers/${offerId}/accept`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) return setActionMessage(data.error);
    router.push(`/meddelanden/${data.transaction.id}`);
  }

  async function declineOffer(offerId: string) {
    const res = await fetch(`/api/offers/${offerId}/decline`, { method: "POST" });
    if (res.ok) load();
  }

  async function updateSearch(body: Record<string, unknown>) {
    const res = await fetch(`/api/searches/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) load();
  }

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!search) return <p className="text-sm text-gray-400">Laddar…</p>;

  const isOwner = user && user.id === search.user.id;

  return (
    <div className="flex flex-col gap-8">
      {notifiedSellers > 0 && (
        <p className="rounded-xl bg-guld-400/10 p-3 text-sm text-guld-500">
          Klart! {notifiedSellers} säljare som redan har något liknande har notifierats direkt.
        </p>
      )}
      <div className="card flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-kungsbla-700">{search.user.name} söker</h1>
          <span className="text-xs text-gray-400">{search.location}</span>
        </div>
        {search.images.length > 0 && (
          <div className="flex gap-2 overflow-x-auto">
            {search.images.map((img) => (
              <img key={img.url} src={img.url} alt="" className="h-32 w-32 flex-shrink-0 rounded-xl object-cover" />
            ))}
          </div>
        )}
        <p className="text-sm text-gray-700">{search.description}</p>
        {search.budgetMax && <p className="text-sm font-semibold text-kungsbla-600">Budget: max {search.budgetMax} kr</p>}
        {isOwner && (
          <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
            <span className="text-xs font-medium text-gray-400">Status: {search.status}</span>
            <div className="ml-auto flex flex-wrap gap-2">
              {search.status === "ACTIVE" && (
                <button className="btn-secondary !px-3 !py-1 text-xs" onClick={() => updateSearch({ status: "PAUSED" })}>
                  Pausa
                </button>
              )}
              {search.status === "PAUSED" && (
                <button className="btn-secondary !px-3 !py-1 text-xs" onClick={() => updateSearch({ status: "ACTIVE" })}>
                  Återaktivera
                </button>
              )}
              {["ACTIVE", "PAUSED"].includes(search.status) && (
                <>
                  <button className="btn-secondary !px-3 !py-1 text-xs" onClick={() => updateSearch({ extend: true })}>
                    Förläng 30 dagar
                  </button>
                  <button className="btn-secondary !px-3 !py-1 text-xs" onClick={() => updateSearch({ status: "FULFILLED" })}>
                    Markera hittad
                  </button>
                  <button className="btn-secondary !px-3 !py-1 text-xs" onClick={() => updateSearch({ status: "CANCELLED" })}>
                    Avsluta
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-bold text-kungsbla-700">Erbjudanden ({search.offers.length})</h2>
        {actionMessage && <p className="mb-3 text-sm text-red-600">{actionMessage}</p>}
        <div className="flex flex-col gap-3">
          {search.offers.map((offer) => (
            <div key={offer.id} className="card flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                {offer.images[0] && <img src={offer.images[0].url} alt="" className="h-14 w-14 rounded-lg object-cover" />}
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-kungsbla-700">
                    {offer.seller.name}
                    {offer.seller.emailVerifiedAt && <span className="badge-guld">✓</span>}
                  </div>
                  <p className="text-xs text-gray-500">
                    {offer.seller.ratingCount > 0
                      ? `${(offer.seller.ratingSum / offer.seller.ratingCount).toFixed(1)} ★ · `
                      : ""}
                    {offer.seller.dealsCompleted} genomförda affärer
                  </p>
                  <p className="text-sm text-gray-700">{offer.message}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-kungsbla-600">{offer.price} kr</span>
                {isOwner && offer.status === "SENT" && (
                  <div className="flex gap-2">
                    <button className="btn-primary !px-3 !py-1.5 text-xs" onClick={() => acceptOffer(offer.id)}>
                      Ge åtkomst
                    </button>
                    <button className="btn-secondary !px-3 !py-1.5 text-xs" onClick={() => declineOffer(offer.id)}>
                      Ej aktuellt
                    </button>
                  </div>
                )}
                {offer.status !== "SENT" && (
                  <span className="text-xs font-medium text-gray-400">
                    {offer.status === "ACCEPTED" ? "Godkänt" : "Ej aktuellt"}
                  </span>
                )}
              </div>
            </div>
          ))}
          {search.offers.length === 0 && <p className="text-sm text-gray-400">Inga erbjudanden än.</p>}
        </div>
        {isOwner && (
          <p className="mt-3 text-xs text-gray-400">
            Säljaren betalar en liten kontaktavgift (eller inget om de har Sluta Leta Plus) för att få
            tillgång till chatten när du trycker Ge åtkomst.
          </p>
        )}
      </div>

      {!isOwner && user && search.status === "ACTIVE" && (
        <div className="card">
          <h2 className="mb-3 text-lg font-bold text-kungsbla-700">Lämna erbjudande</h2>
          <form onSubmit={submitOffer} className="flex flex-col gap-3">
            <input
              className="input"
              type="number"
              placeholder="Pris (kr)"
              value={offerPrice}
              onChange={(e) => setOfferPrice(e.target.value)}
              required
            />
            <textarea
              className="input"
              placeholder="Kort beskrivning"
              value={offerMessage}
              onChange={(e) => setOfferMessage(e.target.value)}
              required
            />
            <ImageUploader images={offerImages} onChange={setOfferImages} />
            {actionMessage && <p className="text-sm text-red-600">{actionMessage}</p>}
            <button className="btn-primary w-fit" type="submit" disabled={submitting}>
              {submitting ? "Skickar…" : "Lämna erbjudande"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default function SearchDetailPage() {
  return (
    <Suspense fallback={<p className="text-sm text-gray-400">Laddar…</p>}>
      <SearchDetailContent />
    </Suspense>
  );
}
