"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/useCurrentUser";

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useCurrentUser();
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
    // router.refresh() uppdaterar bara serverkomponenter — CurrentUserProvider
    // sitter högre upp i trädet och monteras inte om vid navigering, så utan
    // denna explicita refresh() fortsätter NavBar och resten av sidan visa
    // "utloggad" tills man laddar om sidan helt, trots att inloggningskakan
    // redan är satt korrekt.
    await refresh();
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
    router.push("/");
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
