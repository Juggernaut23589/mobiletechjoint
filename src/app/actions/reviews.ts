"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient, createServerAuthClient } from "@/lib/supabase/server";
import { getCustomerProfile } from "@/lib/account";
import type { ProductReview } from "@/types/database";

type Result = { error?: string; notice?: string };

/** A customer's own review for a product, whatever its status — so the
 *  submission form can show "you already reviewed this" / let them edit
 *  it, rather than only ever seeing the public approved copy. */
export async function getMyReviewForProduct(productId: string): Promise<ProductReview | null> {
  const authClient = await createServerAuthClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) return null;

  const { data } = await createServiceClient()
    .from("product_reviews")
    .select("*")
    .eq("product_id", productId)
    .eq("customer_id", user.id)
    .maybeSingle();
  return (data as ProductReview | null) ?? null;
}

/** Submits (or edits) the logged-in customer's review for a product.
 *  Requires an account — unlike checkout, this isn't a friction point
 *  worth removing: it's what keeps a review traceable to a real person
 *  and lets "verified purchase" mean something. Always re-queues the row
 *  as 'pending' (even on edit) since a staff member hasn't seen the new
 *  content yet. */
export async function submitProductReview(
  _prev: Result,
  formData: FormData
): Promise<Result> {
  const authClient = await createServerAuthClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) return { error: "Please log in to write a review." };

  const productId = String(formData.get("productId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const rating = Number(formData.get("rating"));
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!productId) return { error: "Missing product." };
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: "Choose a star rating from 1 to 5." };
  }
  if (!body) return { error: "Write a few words about the product." };
  if (body.length > 4000) return { error: "That review is too long." };

  const supabase = createServiceClient();

  const profile = await getCustomerProfile(user.id);
  const reviewerName = profile?.full_name?.trim() || user.email?.split("@")[0] || "Customer";

  // Verified purchase: a real paid (or later refunded) order containing
  // this product, belonging to this customer — never a client-supplied
  // flag. Two plain queries rather than one embedded-filter join, so the
  // logic stays obvious: which of this customer's qualifying orders (if
  // any) actually contain this product.
  const { data: customerOrders } = await supabase
    .from("orders")
    .select("id")
    .eq("customer_id", user.id)
    .in("status", ["paid", "refunded"])
    .order("created_at", { ascending: false });

  let verifiedOrderId: string | null = null;
  if (customerOrders && customerOrders.length > 0) {
    const { data: matchingItem } = await supabase
      .from("order_items")
      .select("order_id")
      .eq("product_id", productId)
      .in(
        "order_id",
        customerOrders.map((o) => o.id)
      )
      .limit(1)
      .maybeSingle();
    verifiedOrderId = matchingItem?.order_id ?? null;
  }

  const { error } = await supabase.from("product_reviews").upsert(
    {
      product_id: productId,
      customer_id: user.id,
      order_id: verifiedOrderId,
      is_verified_purchase: Boolean(verifiedOrderId),
      reviewer_name: reviewerName,
      rating,
      title: title || null,
      body,
      status: "pending",
      moderated_by: null,
      moderated_at: null,
      moderation_note: null,
    },
    { onConflict: "product_id,customer_id" }
  );

  if (error) return { error: error.message };

  if (slug) revalidatePath(`/products/${slug}`);
  return { notice: "Thanks — your review will appear once it's been checked." };
}
