"use client";

import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error ?? "Något gick fel.");
    // Inloggningen går via fetch(), inte en vanlig formulärinskickning, så
    // webbläsaren ser aldrig den signal den normalt letar efter för att
    // erbjuda "Spara lösenord?". Credential Management API ger den signalen
    // explicit (stöds av Chrome/Edge/Android; webbläsare utan stöd ignorerar
    // det bara, se try/catch).
    if (typeof window !== "undefined" && "PasswordCredential" in window) {
      try {
        const PasswordCredentialCtor = (
          window as unknown as { PasswordCredential: new (data: { id: string; password: string; name?: string }) => Credential }
        ).PasswordCredential;
        await navigator.credentials.store(new PasswordCredentialCtor({ id: email, password, name: email }));
      } catch {
        // Inte kritiskt om det misslyckas.
      }
    }
    // Hård navigering (inte router.push) med avsikt: iOS Safari har visat sig
    // inte alltid skriva en Set-Cookie från ett fetch()-svar till sitt
    // beständiga kakförråd förrän sidan gör en riktig sidladdning. Med bara
    // en klientsidig router.push kan inloggningskakan ligga kvar enbart i
    // minnet och försvinna om Safari stängs helt innan nästa riktiga
    // sidladdning — vilket ser ut som att man blir utloggad varje gång man
    // startar om appen. En fullständig navigering här tvingar webbläsaren
    // att committa kakan till disk.
    window.location.href = "/";
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-kungsbla-700">Välkommen tillbaka</h1>
        <p className="mt-1 text-sm text-gray-500">Logga in för att se dina sökningar, erbjudanden och meddelanden.</p>
      </div>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <input
          className="input"
          placeholder="E-post"
          aria-label="E-post"
          type="email"
          name="email"
          id="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="input"
          placeholder="Lösenord"
          aria-label="Lösenord"
          type="password"
          name="password"
          id="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? "Loggar in…" : "Logga in"}
        </button>
      </form>
      <div className="flex justify-between text-sm text-gray-500">
        <Link href="/registrera" className="font-semibold text-kungsbla-500">
          Skapa konto
        </Link>
        <Link href="/glomt-losenord" className="font-semibold text-kungsbla-500">
          Glömt lösenord?
        </Link>
      </div>
    </div>
  );
}
