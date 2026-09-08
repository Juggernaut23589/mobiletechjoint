import { createClient } from "@supabase/supabase-js";

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
