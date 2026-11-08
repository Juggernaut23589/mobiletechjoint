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

export interface RatingBreakdown {
  counts: Record<1 | 2 | 3 | 4 | 5, number>;
  total: number;
}

/** How many approved reviews landed at each star value (1-5), for the
 *  rating-distribution bar graph. Only selects the rating column — the
 *  breakdown never needs review bodies. */
export async function getRatingBreakdown(productId: string): Promise<RatingBreakdown> {
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as RatingBreakdown["counts"];

  const { data, error } = await createPublicClient()
    .from("product_reviews")
    .select("rating")
    .eq("product_id", productId)
    .eq("status", "approved");

  if (error) {
    console.error("getRatingBreakdown failed:", error.message);
    return { counts, total: 0 };
  }

  let total = 0;
  for (const row of (data ?? []) as { rating: number }[]) {
    if (row.rating >= 1 && row.rating <= 5) {
      counts[row.rating as 1 | 2 | 3 | 4 | 5]++;
      total++;
    }
  }
  return { counts, total };
}
