"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCurrentUser } from "@/lib/useCurrentUser";

const LINKS = [
  { href: "/", label: "Hem" },
  { href: "/utforska", label: "Utforska" },
  { href: "/sok", label: "Sök" },
  { href: "/meddelanden", label: "Meddelanden" },
];

export default function NavBar() {
  const pathname = usePathname();
  const { user } = useCurrentUser();

  return (
    <header className="sticky top-0 z-20 border-b border-gray-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold tracking-tight text-kungsbla-600">
          Sluta Leta
        </Link>
        <nav className="hidden gap-6 sm:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium ${pathname === link.href ? "text-kungsbla-600" : "text-gray-500 hover:text-kungsbla-500"}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {user === undefined ? null : user ? (
            <Link href={`/profil/${user.id}`} className="text-sm font-medium text-kungsbla-600">
              {user.name}
            </Link>
          ) : (
            <Link href="/logga-in" className="btn-primary !px-4 !py-1.5 text-xs">
              Logga in
            </Link>
          )}
        </div>
      </div>
      <nav className="flex justify-around border-t border-gray-100 py-2 sm:hidden">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`text-xs font-medium ${pathname === link.href ? "text-kungsbla-600" : "text-gray-500"}`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
