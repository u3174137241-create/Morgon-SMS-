"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ImageUploader from "@/app/components/ImageUploader";

const CONDITIONS = ["Spelar ingen roll", "Ny", "Begagnad", "Renoveringsobjekt"] as const;

function CreateSearchForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [text, setText] = useState(params.get("text") ?? "");
  const [condition, setCondition] = useState<(typeof CONDITIONS)[number]>("Spelar ingen roll");
  const [budgetMax, setBudgetMax] = useState("");
  const [location, setLocation] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/searches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        images,
        condition: condition === "Spelar ingen roll" ? undefined : condition,
        budgetMax: budgetMax ? Number(budgetMax) : undefined,
        location: location.trim() || undefined,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error ?? "Något gick fel.");
    const notified = data.notifiedSellers ?? 0;
    router.push(`/sok/${data.search.id}${notified > 0 ? `?notified=${notified}` : ""}`);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Beskriv vad du söker</label>
        <textarea
          className="input min-h-28"
          placeholder="T.ex. 'Jag söker en begagnad iPhone 15 Pro, max 7000 kr, Stockholm.'"
          value={text}
          onChange={(e) => setText(e.target.value)}
          required
        />
        <p className="mt-1 text-xs text-gray-400">
          Skriv precis som du vill — vi skapar alltid en sökning av texten. Vill du vara extra
          tydlig kan du också välja skick, budget och plats nedan.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Skick</label>
          <select className="input" value={condition} onChange={(e) => setCondition(e.target.value as (typeof CONDITIONS)[number])}>
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Budget (max kr)</label>
          <input
            className="input"
            type="number"
            placeholder="T.ex. 7000"
            value={budgetMax}
            onChange={(e) => setBudgetMax(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Plats</label>
          <input
            className="input"
            placeholder="T.ex. Stockholm"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Bilder (valfritt)</label>
        <ImageUploader images={images} onChange={setImages} />
        <p className="mt-1 text-xs text-gray-400">En bild hjälper säljare förstå exakt vad du vill ha, men det går bra utan.</p>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="btn-primary w-fit" type="submit" disabled={loading}>
        {loading ? "Skapar…" : "Skapa sökning — gratis"}
      </button>
    </form>
  );
}

export default function CreateSearchPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <h1 className="text-2xl font-bold text-kungsbla-700">Vad letar du efter?</h1>
      <Suspense fallback={null}>
        <CreateSearchForm />
      </Suspense>
    </div>
  );
}
