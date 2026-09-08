import { createPublicClient } from "@/lib/supabase/server";
import type { Category, CategoryWithCount, ProductWithImages } from "@/types/database";

/** All published products, newest first, with images and category joined. */
export async function getPublishedProducts(limit?: number): Promise<ProductWithImages[]> {
  const supabase = createPublicClient();
  let query = supabase
    .from("products")
    .select("*, product_images(*), category:categories(*)")
    .eq("status", "published")
    .order("created_at", { ascending: false });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;

  if (error) {
    console.error("getPublishedProducts failed:", error.message);
    return [];
  }
  return (data ?? []) as unknown as ProductWithImages[];
}

/** A single published product by slug, or null if not found / not published. */
export async function getPublishedProductBySlug(
  slug: string
): Promise<ProductWithImages | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, product_images(*), category:categories(*)")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    console.error("getPublishedProductBySlug failed:", error.message);
    return null;
  }
  return data as unknown as ProductWithImages | null;
}

export async function getCategories(): Promise<Category[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name");

  if (error) {
    console.error("getCategories failed:", error.message);
    return [];
  }
  return data ?? [];
}

/** Categories with a live count of published products, for the sidebar —
 *  a category with zero published products still lists (so it's obvious
 *  it's just empty right now, not broken), but sorts to the bottom. */
export async function getCategoriesWithCounts(): Promise<CategoryWithCount[]> {
  const supabase = createPublicClient();
  const [{ data: categories, error: catError }, { data: products, error: prodError }] =
    await Promise.all([
      supabase.from("categories").select("*").order("name"),
      supabase.from("products").select("category_id").eq("status", "published"),
    ]);

  if (catError || prodError) {
    console.error("getCategoriesWithCounts failed:", catError?.message ?? prodError?.message);
    return [];
  }

  const counts = new Map<string, number>();
  for (const p of products ?? []) {
    if (!p.category_id) continue;
    counts.set(p.category_id, (counts.get(p.category_id) ?? 0) + 1);
  }

  return (categories ?? [])
    .map((c) => ({ ...c, product_count: counts.get(c.id) ?? 0 }))
    .sort((a, b) => b.product_count - a.product_count);
}

/** Admin-curated "hot selling" picks for the homepage hero carousel. Falls
 *  back to the newest published products if nothing has been marked
 *  featured yet, so the hero is never empty on a fresh catalogue. */
export async function getFeaturedProducts(limit = 8): Promise<ProductWithImages[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, product_images(*), category:categories(*)")
    .eq("status", "published")
    .eq("is_featured", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getFeaturedProducts failed:", error.message);
    return [];
  }
  if (data && data.length > 0) return data as unknown as ProductWithImages[];
  return getPublishedProducts(limit);
}

/** Admin-curated "trending" picks. Same fallback reasoning as featured. */
export async function getTrendingProducts(limit = 8): Promise<ProductWithImages[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, product_images(*), category:categories(*)")
    .eq("status", "published")
    .eq("is_trending", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getTrendingProducts failed:", error.message);
    return [];
  }
  if (data && data.length > 0) return data as unknown as ProductWithImages[];
  return getPublishedProducts(limit);
}

/** Genuinely real, not curated: just the newest published products. */
export async function getNewArrivals(limit = 8): Promise<ProductWithImages[]> {
  return getPublishedProducts(limit);
}

/** Other published products in the same category — used for cross-sells on
 *  the product detail page and the cart. */
export async function getRelatedProducts(
  categoryId: string | null,
  excludeProductId: string,
  limit = 4
): Promise<ProductWithImages[]> {
  if (!categoryId) return [];
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, product_images(*), category:categories(*)")
    .eq("status", "published")
    .eq("category_id", categoryId)
    .neq("id", excludeProductId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getRelatedProducts failed:", error.message);
    return [];
  }
  return (data ?? []) as unknown as ProductWithImages[];
}

export async function getPublishedProductsByCategorySlug(
  categorySlug: string
): Promise<{ category: Category | null; products: ProductWithImages[] }> {
  const supabase = createPublicClient();
  const { data: category } = await supabase
    .from("categories")
    .select("*")
    .eq("slug", categorySlug)
    .maybeSingle();

  if (!category) return { category: null, products: [] };

  const { data, error } = await supabase
    .from("products")
    .select("*, product_images(*), category:categories(*)")
    .eq("status", "published")
    .eq("category_id", category.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getPublishedProductsByCategorySlug failed:", error.message);
    return { category, products: [] };
  }
  return { category, products: (data ?? []) as unknown as ProductWithImages[] };
}
