import { createPublicClient } from "@/lib/supabase/server";
import type {
  Category,
  CategoryWithCount,
  BrandWithCount,
  ProductWithImages,
} from "@/types/database";

/** All published products, newest first, with images and category joined. */
export async function getPublishedProducts(limit?: number): Promise<ProductWithImages[]> {
  const supabase = createPublicClient();
  let query = supabase
    .from("products")
    .select("*, product_images(*), category:categories(*), brand:brands(*)")
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
    .select("*, product_images(*), category:categories(*), brand:brands(*)")
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
    .select("*, product_images(*), category:categories(*), brand:brands(*)")
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
    .select("*, product_images(*), category:categories(*), brand:brands(*)")
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

/** Products with a real admin-entered "was" price — never a fabricated
 *  discount. Empty array (not a fallback) if nobody's set one yet. */
export async function getDealsProducts(limit?: number): Promise<ProductWithImages[]> {
  const supabase = createPublicClient();
  let query = supabase
    .from("products")
    .select("*, product_images(*), category:categories(*), brand:brands(*)")
    .eq("status", "published")
    .not("compare_at_price_kobo", "is", null)
    .order("created_at", { ascending: false });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;

  if (error) {
    console.error("getDealsProducts failed:", error.message);
    return [];
  }
  return (data ?? []) as unknown as ProductWithImages[];
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
    .select("*, product_images(*), category:categories(*), brand:brands(*)")
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

export interface CategoryProductFilters {
  brandSlugs?: string[];
  inStockOnly?: boolean;
  maxPriceKobo?: number;
  sort?: "featured" | "price_asc" | "price_desc" | "newest";
  page?: number;
  perPage?: number;
}

export async function getPublishedProductsByCategorySlug(
  categorySlug: string,
  filters: CategoryProductFilters = {}
): Promise<{
  category: Category | null;
  products: ProductWithImages[];
  total: number;
}> {
  const supabase = createPublicClient();
  const { data: category } = await supabase
    .from("categories")
    .select("*")
    .eq("slug", categorySlug)
    .maybeSingle();

  if (!category) return { category: null, products: [], total: 0 };

  const { brandSlugs, inStockOnly, maxPriceKobo, sort = "featured", page = 1, perPage = 24 } =
    filters;

  let query = supabase
    .from("products")
    .select("*, product_images(*), category:categories(*), brand:brands(*)", {
      count: "exact",
    })
    .eq("status", "published")
    .eq("category_id", category.id);

  if (brandSlugs && brandSlugs.length > 0) {
    const { data: brands } = await supabase.from("brands").select("id").in("slug", brandSlugs);
    const brandIds = (brands ?? []).map((b) => b.id);
    // Unrecognized brand slugs should show an empty result, not silently
    // ignore the filter and show everything.
    query = query.in("brand_id", brandIds.length > 0 ? brandIds : ["00000000-0000-0000-0000-000000000000"]);
  }
  if (inStockOnly) query = query.gt("stock_quantity", 0);
  if (maxPriceKobo != null) query = query.lte("price_kobo", maxPriceKobo);

  if (sort === "price_asc") query = query.order("price_kobo", { ascending: true });
  else if (sort === "price_desc") query = query.order("price_kobo", { ascending: false });
  else query = query.order("created_at", { ascending: false });

  const from = (page - 1) * perPage;
  query = query.range(from, from + perPage - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("getPublishedProductsByCategorySlug failed:", error.message);
    return { category, products: [], total: 0 };
  }
  return {
    category,
    products: (data ?? []) as unknown as ProductWithImages[],
    total: count ?? 0,
  };
}

/** Highest price_kobo among a category's published products — bounds the
 *  price-range filter slider so it always covers what's actually there. */
export async function getCategoryMaxPriceKobo(categoryId: string): Promise<number> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select("price_kobo")
    .eq("status", "published")
    .eq("category_id", categoryId)
    .order("price_kobo", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return 0;
  return data.price_kobo ?? 0;
}

/** Brands actually present among a category's published products, with a
 *  live count — so the filter only ever shows options that return results. */
export async function getBrandsForCategory(categoryId: string): Promise<BrandWithCount[]> {
  const supabase = createPublicClient();
  const { data: products, error } = await supabase
    .from("products")
    .select("brand_id, brand:brands(*)")
    .eq("status", "published")
    .eq("category_id", categoryId)
    .not("brand_id", "is", null);

  if (error) {
    console.error("getBrandsForCategory failed:", error.message);
    return [];
  }

  const counts = new Map<string, BrandWithCount>();
  for (const p of products ?? []) {
    const brand = p.brand as unknown as { id: string; name: string; slug: string; created_at: string } | null;
    if (!brand) continue;
    const existing = counts.get(brand.id);
    if (existing) existing.product_count += 1;
    else counts.set(brand.id, { ...brand, product_count: 1 });
  }

  return Array.from(counts.values()).sort((a, b) => b.product_count - a.product_count);
}

/** Published products matching a free-text query against name/description —
 *  backs the navbar search box. Empty/whitespace query returns no results
 *  rather than the full catalog, so an empty submit doesn't look broken. */
export async function searchProducts(query: string, limit = 24): Promise<ProductWithImages[]> {
  const q = query.trim();
  if (!q) return [];
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, product_images(*), category:categories(*), brand:brands(*)")
    .eq("status", "published")
    .or(`name.ilike.%${q}%,description.ilike.%${q}%`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("searchProducts failed:", error.message);
    return [];
  }
  return (data ?? []) as unknown as ProductWithImages[];
}

/** Complementary cross-sells: real products pulled from whichever categories
 *  an admin has mapped as pairing with this product's category (e.g.
 *  Cameras -> Lenses, Batteries, Chargers). Falls back to same-category
 *  related products if no mapping exists yet for this category, so a
 *  product page is never left without any cross-sell section. */
export async function getComplementaryProducts(
  categoryId: string | null,
  excludeProductId: string,
  limit = 4
): Promise<ProductWithImages[]> {
  if (!categoryId) return [];
  const supabase = createPublicClient();

  const { data: complements } = await supabase
    .from("category_complements")
    .select("complement_category_id")
    .eq("category_id", categoryId);

  const complementIds = (complements ?? []).map((c) => c.complement_category_id);

  if (complementIds.length === 0) {
    return getRelatedProducts(categoryId, excludeProductId, limit);
  }

  const { data, error } = await supabase
    .from("products")
    .select("*, product_images(*), category:categories(*), brand:brands(*)")
    .eq("status", "published")
    .in("category_id", complementIds)
    .neq("id", excludeProductId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getComplementaryProducts failed:", error.message);
    return [];
  }
  return (data ?? []) as unknown as ProductWithImages[];
}
