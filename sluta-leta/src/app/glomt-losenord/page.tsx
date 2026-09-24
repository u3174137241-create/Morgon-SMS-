"use client";

import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
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
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4">
      <h1 className="text-2xl font-bold text-kungsbla-700">Glömt lösenord</h1>
      {message ? (
        <p className="rounded-xl bg-kungsbla-50 p-4 text-sm text-kungsbla-600">{message}</p>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <input className="input" placeholder="E-post" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? "Skickar…" : "Skicka återställningslänk"}
          </button>
        </form>
      )}
    </div>
  );
}
