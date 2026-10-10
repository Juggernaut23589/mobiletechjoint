"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient, createServerAuthClient } from "@/lib/supabase/server";

/** Adds or removes a product from the logged-in customer's wishlist,
 *  returning the new state so the client button can update without a
 *  round-trip refetch. Requires an account — unlike the cart, a wishlist
 *  only means something tied to a real customer. */
export async function toggleWishlist(
  productId: string
): Promise<{ inWishlist: boolean } | { error: string }> {
  const authClient = await createServerAuthClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) return { error: "Please log in to save items to your wishlist." };
  if (!productId) return { error: "Missing product." };

  const supabase = createServiceClient();
  const { data: existing } = await supabase
    .from("wishlist_items")
    .select("id")
    .eq("customer_id", user.id)
    .eq("product_id", productId)
    .maybeSingle();

  if (existing) {
    await supabase.from("wishlist_items").delete().eq("id", existing.id);
    revalidatePath("/account/wishlist");
    return { inWishlist: false };
  }

  const { error } = await supabase
    .from("wishlist_items")
    .insert({ customer_id: user.id, product_id: productId });
  if (error) return { error: error.message };

  revalidatePath("/account/wishlist");
  return { inWishlist: true };
}
