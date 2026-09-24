"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ImageUploader from "@/app/components/ImageUploader";

function CreateSearchForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [text, setText] = useState(params.get("text") ?? "");
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
      body: JSON.stringify({ text, images }),
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
          Vi läser automatiskt ut budget, plats och typ av produkt eller tjänst ur din text.
        </p>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Bilder (minst en)</label>
        <ImageUploader images={images} onChange={setImages} />
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
