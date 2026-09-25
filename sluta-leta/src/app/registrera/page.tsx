"use client";

import { useState } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error ?? "Något gick fel.");
    setMessage(data.message);
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4">
      <h1 className="text-2xl font-bold text-kungsbla-700">Skapa konto</h1>
      {message ? (
        <p className="rounded-xl bg-kungsbla-50 p-4 text-sm text-kungsbla-600">{message}</p>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <input className="input" placeholder="Namn" value={name} onChange={(e) => setName(e.target.value)} required />
          <input className="input" placeholder="E-post" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input
            className="input"
            placeholder="Lösenord (minst 8 tecken)"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? "Skapar konto…" : "Skapa konto"}
          </button>
          <p className="text-xs text-gray-400">
            Genom att skapa ett konto godkänner du våra{" "}
            <Link href="/villkor" className="underline">
              användarvillkor
            </Link>{" "}
            och vår{" "}
            <Link href="/integritet" className="underline">
              integritetspolicy
            </Link>
            .
          </p>
        </form>
      )}
      <p className="text-sm text-gray-500">
        Har du redan ett konto?{" "}
        <Link href="/logga-in" className="font-semibold text-kungsbla-500">
          Logga in
        </Link>
      </p>
    </div>
  );
}
