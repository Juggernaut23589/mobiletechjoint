import { createPublicClient } from "@/lib/supabase/server";
import type { Category, ProductWithImages } from "@/types/database";

/** All published products, newest first, with images and category joined. */
export async function getPublishedProducts(): Promise<ProductWithImages[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, product_images(*), category:categories(*)")
    .eq("status", "published")
    .order("created_at", { ascending: false });

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
