import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import NavBar from "./components/NavBar";

const APP_URL = process.env.APP_BASE_URL ?? "https://sluta-leta.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: "Sluta Leta",
  description: "Sluta leta. Låt säljarna hitta dig.",
  openGraph: {
    title: "Sluta Leta",
    description: "Beskriv vad du letar efter — säljare hittar dig och lämnar erbjudanden.",
    url: APP_URL,
    siteName: "Sluta Leta",
    locale: "sv_SE",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <body className="min-h-screen bg-white font-sans antialiased">
        <NavBar />
        <main className="mx-auto max-w-5xl px-4 pb-24 pt-6 sm:pb-16">{children}</main>
        <footer className="hidden border-t border-gray-100 py-6 text-center text-xs text-gray-400 sm:block">
          <Link href="/villkor" className="underline">
            Användarvillkor
          </Link>{" "}
          ·{" "}
          <Link href="/integritet" className="underline">
            Integritetspolicy
          </Link>
        </footer>
      </body>
    </html>
  );
}
