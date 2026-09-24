"use client";

import { useState } from "react";
import ImageUploader from "@/app/components/ImageUploader";

type Match = {
  search: { id: string; title: string; description: string; budgetMax: number | null; location: string; user: { name: string } };
  score: number;
};

export default function FindBuyersPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [offerState, setOfferState] = useState<Record<string, "idle" | "sending" | "sent" | "error">>({});

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMatches(null);
    const res = await fetch("/api/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, price: Number(price), location, images }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error ?? "Något gick fel.");
    setMatches(data.matches);
  }

  async function sendOffer(searchId: string) {
    setOfferState((s) => ({ ...s, [searchId]: "sending" }));
    const res = await fetch("/api/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ searchId, price: Number(price), message: description, images }),
    });
    setOfferState((s) => ({ ...s, [searchId]: res.ok ? "sent" : "error" }));
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-kungsbla-700">Hitta köpare</h1>
        <p className="text-sm text-gray-500">
          Beskriv vad du säljer så letar vi upp köpare i Sluta Leta som redan söker precis det.
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <input className="input" placeholder="Vad säljer du?" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <textarea
          className="input"
          placeholder="Beskrivning"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
        <input className="input" type="number" placeholder="Pris (kr)" value={price} onChange={(e) => setPrice(e.target.value)} required />
        <input className="input" placeholder="Plats (t.ex. Stockholm)" value={location} onChange={(e) => setLocation(e.target.value)} required />
        <ImageUploader images={images} onChange={setImages} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary w-fit" type="submit" disabled={loading}>
          {loading ? "Letar köpare…" : "Hitta köpare"}
        </button>
      </form>

      {matches && (
        <div>
          <h2 className="mb-3 text-lg font-bold text-kungsbla-700">Matchande köpare ({matches.length})</h2>
          {matches.length === 0 && <p className="text-sm text-gray-400">Inga matchande köpare hittades just nu.</p>}
          <div className="flex flex-col gap-3">
            {matches.map(({ search, score }) => (
              <div key={search.id} className="card flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-kungsbla-700">{search.user.name} söker</p>
                  <p className="text-sm text-gray-600">{search.description}</p>
                  <p className="text-xs text-gray-400">
                    {search.location} · matchpoäng {(score * 100).toFixed(0)}%
                  </p>
                </div>
                <button
                  className="btn-primary !px-3 !py-1.5 text-xs whitespace-nowrap"
                  disabled={offerState[search.id] === "sending" || offerState[search.id] === "sent"}
                  onClick={() => sendOffer(search.id)}
                >
                  {offerState[search.id] === "sent" ? "Skickat!" : offerState[search.id] === "sending" ? "Skickar…" : "Lämna erbjudande"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
