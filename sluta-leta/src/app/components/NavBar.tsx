"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCurrentUser } from "@/lib/useCurrentUser";
import NotificationsBell from "./NotificationsBell";

const LINKS = [
  { href: "/", label: "Hem" },
  { href: "/utforska", label: "Utforska" },
  { href: "/sok", label: "Sök" },
  { href: "/meddelanden", label: "Meddelanden" },
];

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={active ? 2.2 : 1.8} stroke="currentColor" className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 11.5 12 4l9 7.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.5 10v9a1 1 0 0 0 1 1H9a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h2.5a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

function CompassIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={active ? 2.2 : 1.8} stroke="currentColor" className="h-6 w-6">
      <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.8 9.2-1.9 5-5 1.9 1.9-5 5-1.9Z" />
    </svg>
  );
}

function SearchIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={active ? 2.2 : 1.8} stroke="currentColor" className="h-6 w-6">
      <circle cx="10.5" cy="10.5" r="6.5" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m20 20-4.3-4.3" />
    </svg>
  );
}

function ChatIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={active ? 2.2 : 1.8} stroke="currentColor" className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9A1.5 1.5 0 0 1 18.5 16H9l-4 4v-4H5.5A1.5 1.5 0 0 1 4 14.5v-9Z" />
    </svg>
  );
}

function ProfileIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={active ? 2.2 : 1.8} stroke="currentColor" className="h-6 w-6">
      <circle cx="12" cy="8.5" r="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}

const TAB_ICONS: Record<string, (props: { active: boolean }) => React.JSX.Element> = {
  "/": HomeIcon,
  "/utforska": CompassIcon,
  "/sok": SearchIcon,
  "/meddelanden": ChatIcon,
};

function getTabIcon(href: string) {
  return TAB_ICONS[href] ?? HomeIcon;
}

export default function NavBar() {
  const pathname = usePathname();
  const { user } = useCurrentUser();
  const profileHref = user ? `/profil/${user.id}` : "/logga-in";
  const profileActive = pathname.startsWith("/profil") || pathname === "/logga-in";

  return (
    <>
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
              <>
                <NotificationsBell userId={user.id} />
                <Link href={profileHref} className="text-sm font-medium text-kungsbla-600">
                  {user.name}
                </Link>
              </>
            ) : (
              <Link href="/logga-in" className="btn-primary !px-4 !py-1.5 text-xs">
                Logga in
              </Link>
            )}
          </div>
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-gray-100 bg-white/95 py-1.5 pb-[calc(env(safe-area-inset-bottom)+0.375rem)] backdrop-blur sm:hidden">
        {LINKS.map((link) => {
          const Icon = getTabIcon(link.href);
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex min-w-14 flex-col items-center gap-0.5 rounded-lg px-2 py-1 text-[11px] font-medium ${
                active ? "text-kungsbla-600" : "text-gray-400"
              }`}
            >
              <Icon active={active} />
              {link.label}
            </Link>
          );
        })}
        <Link
          href={profileHref}
          className={`flex min-w-14 flex-col items-center gap-0.5 rounded-lg px-2 py-1 text-[11px] font-medium ${
            profileActive ? "text-kungsbla-600" : "text-gray-400"
          }`}
        >
          <ProfileIcon active={profileActive} />
          Profil
        </Link>
      </nav>
    </>
  );
}
