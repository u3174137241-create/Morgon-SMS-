"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/auth/reset-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setLoading(false);
    setMessage(data.message ?? "Om kontot finns har ett mejl skickats.");
    setResetUrl(data.resetUrl ?? null);
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-kungsbla-700">Glömt lösenord</h1>
        <p className="mt-1 text-sm text-gray-500">Ange din e-postadress så skickar vi en länk för att välja ett nytt lösenord.</p>
      </div>
      {message ? (
        <div className="flex flex-col gap-3 rounded-xl bg-kungsbla-50 p-4 text-sm text-kungsbla-600">
          <p>{message}</p>
          {resetUrl && (
            <Link href={resetUrl} className="btn-primary w-fit">
              Återställ lösenord nu
            </Link>
          )}
        </div>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <input
            className="input"
            placeholder="E-post"
            aria-label="E-post"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? "Skickar…" : "Skicka återställningslänk"}
          </button>
        </form>
      )}
    </div>
  );
}
