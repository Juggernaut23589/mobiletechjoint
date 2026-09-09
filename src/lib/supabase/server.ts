import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Anon-key client for server-side reads of public storefront data
 * (published products, categories). Subject to the RLS policies defined
 * in the initial migration — this client can only ever see what an
 * anonymous visitor could see.
 */
export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}

/**
 * Service-role client. Bypasses RLS entirely — use ONLY in server-only code
 * (API routes, Server Actions, webhook handlers) that needs to write orders
 * or read data that has no anon policy (orders, order_items,
 * instagram_import_log). Never import this into a Client Component or
 * anything that ships to the browser.
 */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

/**
 * Cookie-aware anon-key client for Server Components and Server Actions —
 * this is the one that knows who's logged in (customer accounts). Reads
 * and writes the Supabase session cookies via next/headers' cookies(). Use
 * `supabase.auth.getUser()` on the result to get the current customer, or
 * null if signed out.
 *
 * setAll can throw when called from a Server Component (which can't set
 * cookies) — that's expected and safe to swallow here, because proxy.ts
 * already refreshes the session cookie on every request.
 */
export async function createServerAuthClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — proxy.ts handles refresh.
          }
        },
      },
    }
  );
}
