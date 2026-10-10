"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { User } from "lucide-react";

function initialsFor(fullName: string | null): string | null {
  if (!fullName) return null;
  const parts = fullName.trim().split(/\s+/);
  const initials = parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[parts.length - 1][0];
  return initials.toUpperCase();
}

/** Deliberately client-side, mirroring CartLink's pattern — calling
 *  cookies()/getCurrentUser() from a Server Component in the shared layout
 *  would make every page in the app dynamic (this Next.js version doesn't
 *  have Partial Prerendering enabled, so a dynamic API anywhere in the
 *  layout tree opts the whole route out of static rendering/ISR). Defaults
 *  to "Log in" until the client-side check resolves, then flips to an
 *  avatar circle if a session exists — same one-frame-stale tradeoff
 *  CartLink already makes for the cart count. */
export function AccountLink() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [fullName, setFullName] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/status")
      .then((res) => res.json())
      .then((data) => {
        setLoggedIn(Boolean(data.loggedIn));
        setFullName(data.fullName ?? null);
      })
      .catch(() => {});
  }, []);

  if (!loggedIn) {
    return (
      <Link
        href="/account/login"
        className="-m-2 flex items-center gap-1.5 p-2 text-sm font-medium text-white transition-opacity hover:opacity-80"
      >
        <User className="h-5 w-5" strokeWidth={2} />
        <span className="hidden sm:inline">Log in</span>
      </Link>
    );
  }

  const initials = initialsFor(fullName);

  return (
    <Link
      href="/account"
      aria-label="Your account"
      className="-m-2 flex items-center p-2 transition-opacity hover:opacity-80"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-500 text-[11px] font-bold text-brand-900">
        {initials ?? <User className="h-4 w-4" strokeWidth={2} />}
      </span>
    </Link>
  );
}
