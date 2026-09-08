import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Gates /admin/* behind a shared-secret cookie. This is deliberately the
 * simplest thing that works for v1 — a single admin secret, not a full
 * multi-user auth system, since the only job here is "someone completes a
 * draft product's price/stock before publishing" (see checkout's
 * price_required_when_published constraint, and the Instagram-sync
 * proposal's human-confirms-price requirement). If the team grows beyond
 * one or two people needing admin access, replace this with real
 * per-user auth — this is not intended to scale past that.
 *
 * NOTE: this file is named `proxy.ts`, not `middleware.ts` — the
 * `middleware` file convention is deprecated in this Next.js version.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    const cookie = request.cookies.get("mtj_admin_session");
    if (cookie?.value !== process.env.ADMIN_SESSION_SECRET) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/admin/:path*",
};
