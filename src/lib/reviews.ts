import { createPublicClient } from "@/lib/supabase/server";
import type { ProductReview } from "@/types/database";

/** Approved reviews for a product's page — newest first. RLS already
 *  restricts the anon client to status='approved', but the filter is kept
 *  explicit here too so this never silently starts returning more if the
 *  policy ever changes. */
export async function getApprovedReviews(productId: string): Promise<ProductReview[]> {
  const { data, error } = await createPublicClient()
    .from("product_reviews")
    .select("*")
    .eq("product_id", productId)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getApprovedReviews failed:", error.message);
    return [];
  }
  return (data ?? []) as ProductReview[];
}
