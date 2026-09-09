import { NextRequest, NextResponse } from "next/server";
import { createPublicClient } from "@/lib/supabase/server";

/** Real cross-sells based on the categories actually in the cart — not
 *  fabricated. Called client-side from the cart page (a Client Component,
 *  so it can't call the Server-only product-fetching functions directly).
 *
 *  Looks up admin-curated complementary categories for each cart category
 *  (e.g. Cameras -> Lenses, Batteries) and pulls from those; falls back to
 *  the cart's own categories if a category has no mapping yet, so this
 *  never comes back empty just because nobody's curated pairs for it. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const categoryIds = searchParams.get("categories")?.split(",").filter(Boolean) ?? [];
  const excludeIds = searchParams.get("exclude")?.split(",").filter(Boolean) ?? [];
  const limit = Math.min(Number(searchParams.get("limit")) || 4, 8);

  if (categoryIds.length === 0) {
    return NextResponse.json({ products: [] });
  }

  const supabase = createPublicClient();

  const { data: complements } = await supabase
    .from("category_complements")
    .select("complement_category_id")
    .in("category_id", categoryIds);

  const targetCategoryIds =
    complements && complements.length > 0
      ? Array.from(new Set(complements.map((c) => c.complement_category_id)))
      : categoryIds;

  const { data, error } = await supabase
    .from("products")
    .select("*, product_images(*), category:categories(*), brand:brands(*)")
    .eq("status", "published")
    .in("category_id", targetCategoryIds)
    .order("created_at", { ascending: false })
    .limit(limit + excludeIds.length);

  if (error) {
    return NextResponse.json({ products: [] }, { status: 200 });
  }

  const filtered = (data ?? []).filter((p) => !excludeIds.includes(p.id)).slice(0, limit);
  return NextResponse.json({ products: filtered });
}
