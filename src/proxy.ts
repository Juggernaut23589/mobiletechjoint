import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { STAFF_COOKIE_NAME, SUPER_ADMIN_ONLY_ROUTES, decodeStaffSession } from "@/lib/staff-auth";

/**
 * Two independent things happen here:
 *
 * 1. /admin/* stays gated behind the single shared-secret cookie — see the
 *    original comment below, unchanged from v1.
 * 2. /account/* (customer accounts) is gated behind a real Supabase Auth
 *    session. This function also refreshes that session's cookies on every
 *    matched request — the standard @supabase/ssr middleware pattern —
 *    since Server Components can't write cookies themselves.
 *
 * NOTE: this file is named `proxy.ts`, not `middleware.ts` — the
 * `middleware` file convention is deprecated in this Next.js version.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Deliberately called on every matched request (not just /account/*) so
  // the session cookie is refreshed before it expires, same as Supabase's
  // documented pattern — getUser() re-validates against Supabase, not just
  // a locally-decoded cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // This is the simplest thing that works for v1 — a single admin secret,
  // not a full multi-user auth system, since the only job here is "someone
  // completes a draft product's price/stock before publishing." If the
  // team grows beyond one or two people needing admin access, replace this
  // with real per-user auth.
  if (pathname === "/admin/login") {
    return response;
  }
  if (pathname.startsWith("/admin")) {
    const cookie = request.cookies.get("mtj_admin_session");
    if (cookie?.value !== process.env.ADMIN_SESSION_SECRET) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  const isAuthPage = pathname === "/account/login" || pathname === "/account/signup";
  if (pathname.startsWith("/account") && !isAuthPage && !user) {
    const loginUrl = new URL("/account/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Staff portal — separate from the customer account system above and
  // from the legacy shared-password /admin above. A valid session here
  // just means "a real staff account exists and is logged in"; whether
  // they're approved (isPending) or have the right ability for a given
  // page is checked in the page itself, since that needs the full
  // session object, not just a redirect decision.
  const isStaffAuthPage = pathname === "/staff/login" || pathname === "/staff/register";
  if (pathname.startsWith("/staff/dashboard") || (pathname.startsWith("/staff") && !isStaffAuthPage)) {
    const staffCookie = request.cookies.get(STAFF_COOKIE_NAME);
    const staffSession = staffCookie ? await decodeStaffSession(staffCookie.value) : null;

    if (!staffSession) {
      const loginUrl = new URL("/staff/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (
      SUPER_ADMIN_ONLY_ROUTES.some((r) => pathname.startsWith(r)) &&
      staffSession.role !== "super_admin"
    ) {
      return NextResponse.redirect(new URL("/staff/dashboard?error=forbidden", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/account/:path*", "/staff/:path*"],
};
