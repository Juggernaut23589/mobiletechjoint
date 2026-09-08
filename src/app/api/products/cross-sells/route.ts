import { NextRequest, NextResponse } from "next/server";
import { createPublicClient } from "@/lib/supabase/server";

/** Real cross-sells based on the categories actually in the cart — not
 *  fabricated. Called client-side from the cart page (a Client Component,
 *  so it can't call the Server-only product-fetching functions directly). */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const categoryIds = searchParams.get("categories")?.split(",").filter(Boolean) ?? [];
  const excludeIds = searchParams.get("exclude")?.split(",").filter(Boolean) ?? [];
  const limit = Math.min(Number(searchParams.get("limit")) || 4, 8);

  if (categoryIds.length === 0) {
    return NextResponse.json({ products: [] });
  }

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, product_images(*), category:categories(*)")
    .eq("status", "published")
    .in("category_id", categoryIds)
    .order("created_at", { ascending: false })
    .limit(limit + excludeIds.length);

  if (error) {
    return NextResponse.json({ products: [] }, { status: 200 });
  }

  const filtered = (data ?? []).filter((p) => !excludeIds.includes(p.id)).slice(0, limit);
  return NextResponse.json({ products: filtered });
}
