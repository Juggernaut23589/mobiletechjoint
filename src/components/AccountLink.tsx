"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { User } from "lucide-react";

/** Deliberately client-side, mirroring CartLink's pattern — calling
 *  cookies()/getCurrentUser() from a Server Component in the shared layout
 *  would make every page in the app dynamic (this Next.js version doesn't
 *  have Partial Prerendering enabled, so a dynamic API anywhere in the
 *  layout tree opts the whole route out of static rendering/ISR). Defaults
 *  to "Log in" until the client-side check resolves, then flips to
 *  "Account" if a session exists — same one-frame-stale tradeoff CartLink
 *  already makes for the cart count. */
export function AccountLink() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    fetch("/api/auth/status")
      .then((res) => res.json())
      .then((data) => setLoggedIn(Boolean(data.loggedIn)))
      .catch(() => {});
  }, []);

  return (
    <Link
      href={loggedIn ? "/account" : "/account/login"}
      className="-m-2 flex items-center gap-1.5 p-2 text-sm font-medium text-white transition-opacity hover:opacity-80"
    >
      <User className="h-5 w-5" strokeWidth={2} />
      <span className="hidden sm:inline">{loggedIn ? "Account" : "Log in"}</span>
    </Link>
  );
}
