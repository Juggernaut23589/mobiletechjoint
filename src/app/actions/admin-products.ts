"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { nairaToKobo } from "@/lib/money";
import { STAFF_COOKIE_NAME, decodeStaffSession, hasAbility } from "@/lib/staff-auth";

/** Every admin Server Action re-checks the session cookie itself — proxy.ts
 *  protects page navigation, but a Server Action can be invoked directly,
 *  so it must not rely on the page-level gate alone.
 *
 *  Accepts EITHER the legacy shared-password admin cookie (used by
 *  /admin/*, kept as a break-glass fallback) OR a valid staff session
 *  with the "manage_products" ability — so both the old admin pages and
 *  the new /staff/dashboard/products pages can call the same actions. */
async function assertAdmin() {
  const cookieStore = await cookies();
  const legacyCookie = cookieStore.get("mtj_admin_session")?.value;
  if (legacyCookie && legacyCookie === process.env.ADMIN_SESSION_SECRET) return;

  const staffCookie = cookieStore.get(STAFF_COOKIE_NAME)?.value;
  const session = staffCookie ? await decodeStaffSession(staffCookie) : null;
  if (!hasAbility(session, "manage_products")) {
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

/** Full content edit for any product regardless of status — the gap the
 *  original admin UI had: there was a way to price/publish a draft and
 *  toggle a few flags on a published product, but no way to actually
 *  rewrite a product's name/description once it existed. */
export async function updateProductDetails(formData: FormData): Promise<{ error?: string }> {
  await assertAdmin();

  const productId = formData.get("productId") as string;
  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim();
  const priceNaira = formData.get("priceNaira") ? Number(formData.get("priceNaira")) : null;
  const stockQuantity = formData.get("stockQuantity") ? Number(formData.get("stockQuantity")) : null;

  if (!productId) return { error: "Missing product." };
  if (!name) return { error: "Name is required." };

  const update: Record<string, unknown> = {
    name,
    description: description || null,
  };
  if (priceNaira !== null) {
    if (priceNaira <= 0) return { error: "Enter a valid price." };
    update.price_kobo = nairaToKobo(priceNaira);
  }
  if (stockQuantity !== null) {
    if (stockQuantity < 0) return { error: "Enter a valid stock quantity." };
    update.stock_quantity = stockQuantity;
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("products").update(update).eq("id", productId);

  if (error) return { error: error.message };

  revalidatePath(`/staff/dashboard/products/${productId}/edit`);
  revalidatePath("/admin/products");
  revalidatePath("/");
  revalidatePath("/category", "layout");
  return {};
}

export async function updateProductStatus(formData: FormData): Promise<{ error?: string }> {
  await assertAdmin();
  const productId = formData.get("productId") as string;
  const status = formData.get("status") as string;
  if (!productId) return { error: "Missing product." };
  if (!["draft", "published", "archived"].includes(status)) return { error: "Invalid status." };

  const supabase = createServiceClient();
  const { error } = await supabase.from("products").update({ status }).eq("id", productId);
  if (error) return { error: error.message };

  revalidatePath(`/staff/dashboard/products/${productId}/edit`);
  revalidatePath("/admin/products");
  revalidatePath("/");
  return {};
}

/** Uploads a new image or video to an existing product's gallery. Reuses
 *  the same "product-media" Supabase Storage bucket everything else in
 *  this project already writes to (the WooCommerce migration, the
 *  Instagram sync). */
export async function uploadProductImage(formData: FormData): Promise<{ error?: string }> {
  await assertAdmin();

  const productId = formData.get("productId") as string;
  const file = formData.get("file") as File | null;
  const isVideo = formData.get("isVideo") === "true";

  if (!productId) return { error: "Missing product." };
  if (!file || file.size === 0) return { error: "Choose a file first." };

  const supabase = createServiceClient();

  const { count } = await supabase
    .from("product_images")
    .select("*", { count: "exact", head: true })
    .eq("product_id", productId);

  const ext = file.name.split(".").pop() ?? (isVideo ? "mp4" : "jpg");
  const path = `products/${productId}/${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("product-media")
    .upload(path, buffer, { contentType: file.type || undefined });

  if (uploadError) return { error: uploadError.message };

  const { data: publicUrlData } = supabase.storage.from("product-media").getPublicUrl(path);

  const { error: insertError } = await supabase.from("product_images").insert({
    product_id: productId,
    url: publicUrlData.publicUrl,
    is_video: isVideo,
    position: count ?? 0,
  });

  if (insertError) return { error: insertError.message };

  revalidatePath(`/staff/dashboard/products/${productId}/edit`);
  revalidatePath("/");
  return {};
}

export async function deleteProductImage(formData: FormData): Promise<{ error?: string }> {
  await assertAdmin();
  const imageId = formData.get("imageId") as string;
  const productId = formData.get("productId") as string;
  if (!imageId) return { error: "Missing image." };

  const supabase = createServiceClient();

  const { data: image } = await supabase
    .from("product_images")
    .select("url")
    .eq("id", imageId)
    .maybeSingle();

  const { error } = await supabase.from("product_images").delete().eq("id", imageId);
  if (error) return { error: error.message };

  // Best-effort: also remove the file from storage, not just the DB row.
  // Never blocks the delete on a storage failure — a stray file is a
  // minor cleanup issue, but a product that fails to remove a bad image
  // reference is a worse one.
  const marker = "/product-media/";
  const markerIndex = image?.url.indexOf(marker) ?? -1;
  if (markerIndex !== -1 && image) {
    const path = image.url.slice(markerIndex + marker.length);
    await supabase.storage.from("product-media").remove([path]);
  }

  if (productId) revalidatePath(`/staff/dashboard/products/${productId}/edit`);
  revalidatePath("/");
  return {};
}
