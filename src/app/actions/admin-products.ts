"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { nairaToKobo } from "@/lib/money";

/** Every admin Server Action re-checks the session cookie itself — proxy.ts
 *  protects page navigation, but a Server Action can be invoked directly,
 *  so it must not rely on the page-level gate alone. */
async function assertAdmin() {
  const cookieStore = await cookies();
  const value = cookieStore.get("mtj_admin_session")?.value;
  if (!value || value !== process.env.ADMIN_SESSION_SECRET) {
    throw new Error("Unauthorized");
  }
}

export async function publishDraftProduct(formData: FormData): Promise<{ error?: string }> {
  await assertAdmin();

  const productId = formData.get("productId") as string;
  const priceNaira = Number(formData.get("priceNaira"));
  const stockQuantity = Number(formData.get("stockQuantity"));
  const compareAtPriceNairaRaw = formData.get("compareAtPriceNaira");
  const compareAtPriceNaira = compareAtPriceNairaRaw ? Number(compareAtPriceNairaRaw) : null;

  if (!productId) return { error: "Missing product." };
  if (!priceNaira || priceNaira <= 0) return { error: "Enter a valid price." };
  if (!Number.isFinite(stockQuantity) || stockQuantity < 0) {
    return { error: "Enter a valid stock quantity." };
  }
  if (compareAtPriceNaira !== null && compareAtPriceNaira <= priceNaira) {
    return { error: "The \"was\" price must be higher than the actual price." };
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("products")
    .update({
      price_kobo: nairaToKobo(priceNaira),
      compare_at_price_kobo: compareAtPriceNaira ? nairaToKobo(compareAtPriceNaira) : null,
      stock_quantity: stockQuantity,
      status: "published",
    })
    .eq("id", productId);

  if (error) return { error: error.message };

  revalidatePath("/admin/products");
  revalidatePath("/");
  return {};
}

export async function archiveProduct(formData: FormData): Promise<{ error?: string }> {
  await assertAdmin();
  const productId = formData.get("productId") as string;
  if (!productId) return { error: "Missing product." };

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("products")
    .update({ status: "archived" })
    .eq("id", productId);

  if (error) return { error: error.message };

  revalidatePath("/admin/products");
  return {};
}

/** Assigns (or clears) a product's manufacturer/brand — separate from the
 *  merchandising flags, this feeds the category-page brand filter. Manual
 *  correction path for the WooCommerce backfill's keyword-matching, which
 *  is inherently imperfect (see scripts/backfill-brands.ts). */
export async function assignProductBrand(formData: FormData): Promise<{ error?: string }> {
  await assertAdmin();
  const productId = formData.get("productId") as string;
  const brandId = formData.get("brandId") as string;

  if (!productId) return { error: "Missing product." };

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("products")
    .update({ brand_id: brandId || null })
    .eq("id", productId);

  if (error) return { error: error.message };

  revalidatePath("/admin/products");
  revalidatePath("/category", "layout");
  return {};
}

/** Sets or clears a "was" price on an already-published product, for the
 *  real (never fabricated) discount badge on ProductCard. Empty input
 *  clears it. */
export async function setCompareAtPrice(formData: FormData): Promise<{ error?: string }> {
  await assertAdmin();
  const productId = formData.get("productId") as string;
  const compareAtPriceNairaRaw = formData.get("compareAtPriceNaira");
  const compareAtPriceNaira = compareAtPriceNairaRaw ? Number(compareAtPriceNairaRaw) : null;

  if (!productId) return { error: "Missing product." };

  const supabase = createServiceClient();
  const { data: product } = await supabase
    .from("products")
    .select("price_kobo")
    .eq("id", productId)
    .maybeSingle();

  if (compareAtPriceNaira !== null) {
    if (!Number.isFinite(compareAtPriceNaira) || compareAtPriceNaira <= 0) {
      return { error: "Enter a valid amount." };
    }
    if (product?.price_kobo != null && nairaToKobo(compareAtPriceNaira) <= product.price_kobo) {
      return { error: "The \"was\" price must be higher than the actual price." };
    }
  }

  const { error } = await supabase
    .from("products")
    .update({ compare_at_price_kobo: compareAtPriceNaira ? nairaToKobo(compareAtPriceNaira) : null })
    .eq("id", productId);

  if (error) return { error: error.message };

  revalidatePath("/admin/products");
  revalidatePath("/");
  return {};
}

/** Reassigns a product's category — the manual correction path for
 *  scripts/categorize-uncategorized.ts, which is keyword-matching on free
 *  text titles and won't always get it right. */
export async function assignProductCategory(formData: FormData): Promise<{ error?: string }> {
  await assertAdmin();
  const productId = formData.get("productId") as string;
  const categoryId = formData.get("categoryId") as string;

  if (!productId) return { error: "Missing product." };
  if (!categoryId) return { error: "Missing category." };

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("products")
    .update({ category_id: categoryId })
    .eq("id", productId);

  if (error) return { error: error.message };

  revalidatePath("/admin/products");
  revalidatePath("/category", "layout");
  return {};
}

/** Toggles the hero-carousel / trending flags. Both are admin-curated, not
 *  computed — there's no order history yet to derive real "hot selling"
 *  data from (see the merchandising migration's comment). */
export async function toggleMerchandisingFlag(formData: FormData): Promise<{ error?: string }> {
  await assertAdmin();
  const productId = formData.get("productId") as string;
  const field = formData.get("field") as string;
  const nextValue = formData.get("nextValue") === "true";

  if (!productId) return { error: "Missing product." };
  if (field !== "is_featured" && field !== "is_trending") {
    return { error: "Invalid field." };
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("products")
    .update({ [field]: nextValue })
    .eq("id", productId);

  if (error) return { error: error.message };

  revalidatePath("/admin/products");
  revalidatePath("/");
  return {};
}
