"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function VerifyContent() {
  const params = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("Ingen verifieringskod hittades i länken.");
      return;
    }
    fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setStatus("ok");
      })
      .catch((e) => {
        setStatus("error");
        setError(e.message);
      });
  }, [token]);

  if (status === "loading") return <p className="text-sm text-gray-500">Bekräftar din e-post…</p>;
  if (status === "error") return <p className="text-sm text-red-600">{error}</p>;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-kungsbla-600">Din e-postadress är nu bekräftad!</p>
      <Link href="/logga-in" className="btn-primary w-fit">
        Logga in
      </Link>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4">
      <h1 className="text-2xl font-bold text-kungsbla-700">Bekräfta e-post</h1>
      <Suspense fallback={<p className="text-sm text-gray-500">Laddar…</p>}>
        <VerifyContent />
      </Suspense>
    </div>
  );
}
