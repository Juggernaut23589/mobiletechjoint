import { NextResponse } from "next/server";
import { createServerAuthClient, createServiceClient } from "@/lib/supabase/server";

/** Just the product ids, for the client-side wishlist store (WishlistButton
 *  needs to know "is this product already saved" without an N+1 query per
 *  product card) — same reasoning as /api/auth/status being a tiny client
 *  endpoint rather than making every page dynamic. */
export async function GET() {
  const authClient = await createServerAuthClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ productIds: [] });

  const { data } = await createServiceClient()
    .from("wishlist_items")
    .select("product_id")
    .eq("customer_id", user.id);

  return NextResponse.json({ productIds: (data ?? []).map((r) => r.product_id) });
}
