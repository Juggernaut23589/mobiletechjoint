"use server";

import { revalidatePath } from "next/cache";
import slugify from "slugify";
import { createServiceClient } from "@/lib/supabase/server";
import { formatNaira, nairaToKobo } from "@/lib/money";
import { requireStaffAbility } from "@/lib/staff-session";
import { diffFields, logStaffActivity } from "@/lib/activity-log";
import type { StaffSession } from "@/lib/staff-auth";

/** Every product Server Action re-checks the caller itself — proxy.ts
 *  protects page navigation, but a Server Action can be invoked directly,
 *  so it must not rely on the page-level gate alone. */
function requireProductEditor(): Promise<StaffSession> {
  return requireStaffAbility("manage_products");
}

async function getProductSnapshot(productId: string) {
  const { data } = await createServiceClient()
    .from("products")
    .select("name, description, price_kobo, compare_at_price_kobo, stock_quantity, status, brand_id, category_id, is_featured, is_trending")
    .eq("id", productId)
    .maybeSingle();
  return data;
}

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

/** Creates a brand-new product from the staff dashboard — the manual
 *  upload path that replaced the Instagram sync. Everything the edit page
 *  can set is accepted up front so a staff member can go from empty form
 *  to a live listing in one submit, but publishing still requires a price
 *  (the DB's price_required_when_published constraint would reject it
 *  anyway; checking here gives a readable error instead). Any images
 *  attached are uploaded to the same product-media bucket the edit page
 *  uses, in the order they were chosen. Returns the new id so the caller
 *  can land on the edit page for further tweaks. */
export async function createProduct(
  formData: FormData
): Promise<{ error?: string; productId?: string }> {
  let actor: StaffSession;
  try {
    actor = await requireProductEditor();
  } catch {
    return { error: "Forbidden." };
  }

  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim();
  const status = (formData.get("status") as string) || "draft";
  const categoryId = (formData.get("categoryId") as string) || null;
  const brandId = (formData.get("brandId") as string) || null;
  const priceRaw = formData.get("priceNaira") as string;
  const compareAtRaw = formData.get("compareAtPriceNaira") as string;
  const stockRaw = formData.get("stockQuantity") as string;
  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);

  if (!name) return { error: "Name is required." };
  if (status !== "draft" && status !== "published") return { error: "Invalid status." };

  const priceNaira = priceRaw ? Number(priceRaw) : null;
  if (priceNaira !== null && (!Number.isFinite(priceNaira) || priceNaira <= 0)) {
    return { error: "Enter a valid price." };
  }
  if (status === "published" && priceNaira === null) {
    return { error: "A price is required to publish. Save as a draft if it isn't set yet." };
  }

  const compareAtNaira = compareAtRaw ? Number(compareAtRaw) : null;
  if (compareAtNaira !== null) {
    if (!Number.isFinite(compareAtNaira) || compareAtNaira <= 0) {
      return { error: "Enter a valid \"was\" price." };
    }
    if (priceNaira === null || compareAtNaira <= priceNaira) {
      return { error: "The \"was\" price must be higher than the actual price." };
    }
  }

  const stockQuantity = stockRaw ? Number(stockRaw) : 0;
  if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
    return { error: "Enter a valid stock quantity." };
  }

  for (const file of files) {
    if (file.size > MAX_UPLOAD_BYTES) {
      return { error: `"${file.name}" is over 25MB. Compress it and try again.` };
    }
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      return { error: `"${file.name}" isn't an image or video.` };
    }
  }

  const supabase = createServiceClient();

  // Same convention as the WooCommerce import (slug + numeric suffix):
  // a short random tail keeps two "Godox AD300Pro" listings from colliding
  // without the staff member having to think about URLs.
  const base = slugify(name, { lower: true, strict: true }) || "product";
  const slug = `${base}-${Math.floor(1000 + Math.random() * 9000)}`;

  const { data: product, error: insertError } = await supabase
    .from("products")
    .insert({
      name,
      slug,
      description: description || null,
      price_kobo: priceNaira !== null ? nairaToKobo(priceNaira) : null,
      compare_at_price_kobo: compareAtNaira !== null ? nairaToKobo(compareAtNaira) : null,
      stock_quantity: stockQuantity,
      status,
      source: "manual",
      category_id: categoryId,
      brand_id: brandId,
    })
    .select("id")
    .single();

  if (insertError || !product) return { error: insertError?.message ?? "Could not create product." };

  const uploadErrors: string[] = [];
  for (const [position, file] of files.entries()) {
    const isVideo = file.type.startsWith("video/");
    const ext = file.name.split(".").pop() ?? (isVideo ? "mp4" : "jpg");
    const path = `products/${product.id}/${Date.now()}-${position}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("product-media")
      .upload(path, buffer, { contentType: file.type || undefined });
    if (uploadError) {
      uploadErrors.push(`${file.name}: ${uploadError.message}`);
      continue;
    }

    const { data: publicUrlData } = supabase.storage.from("product-media").getPublicUrl(path);
    const { error: imageError } = await supabase.from("product_images").insert({
      product_id: product.id,
      url: publicUrlData.publicUrl,
      is_video: isVideo,
      position,
    });
    if (imageError) uploadErrors.push(`${file.name}: ${imageError.message}`);
  }

  await logStaffActivity(actor, {
    action: "product.create",
    entityType: "product",
    entityId: product.id,
    summary: `Created ${status} product "${name}"${priceNaira !== null ? ` at ${formatNaira(nairaToKobo(priceNaira))}` : ""}`,
    changes: { status, price_kobo: priceNaira !== null ? nairaToKobo(priceNaira) : null, stock_quantity: stockQuantity },
  });

  revalidatePath("/staff/dashboard/products");
  revalidatePath("/");
  revalidatePath("/category", "layout");
  revalidatePath("/brand", "layout");

  if (uploadErrors.length > 0) {
    return {
      productId: product.id,
      error: `Product created, but some media failed: ${uploadErrors.join("; ")}`,
    };
  }
  return { productId: product.id };
}

async function lookupName(table: "brands" | "categories", id: string | null): Promise<string> {
  if (!id) return "none";
  const { data } = await createServiceClient().from(table).select("name").eq("id", id).maybeSingle();
  return data?.name ?? "unknown";
}

function revalidateProduct(productId: string) {
  revalidatePath(`/staff/dashboard/products/${productId}/edit`);
  revalidatePath("/staff/dashboard/products");
  revalidatePath("/");
  revalidatePath("/category", "layout");
  revalidatePath("/brand", "layout");
}

/** Assigns (or clears) a product's manufacturer/brand — separate from the
 *  merchandising flags, this feeds the category-page brand filter. Manual
 *  correction path for the WooCommerce backfill's keyword-matching, which
 *  is inherently imperfect (see scripts/backfill-brands.ts). */
export async function assignProductBrand(formData: FormData): Promise<{ error?: string }> {
  const actor = await requireProductEditor();
  const productId = formData.get("productId") as string;
  const brandId = (formData.get("brandId") as string) || null;
  if (!productId) return { error: "Missing product." };

  const before = await getProductSnapshot(productId);
  if (!before) return { error: "Product not found." };

  const { error } = await createServiceClient()
    .from("products")
    .update({ brand_id: brandId })
    .eq("id", productId);
  if (error) return { error: error.message };

  if (before.brand_id !== brandId) {
    const [from, to] = await Promise.all([lookupName("brands", before.brand_id), lookupName("brands", brandId)]);
    await logStaffActivity(actor, {
      action: "product.brand",
      entityType: "product",
      entityId: productId,
      summary: `Brand for ${before.name}: ${from} → ${to}`,
      changes: { brand_id: { from: before.brand_id, to: brandId } },
    });
  }
  revalidateProduct(productId);
  return {};
}

/** Sets or clears a "was" price on an already-published product, for the
 *  real (never fabricated) discount badge on ProductCard. Empty input
 *  clears it. */
export async function setCompareAtPrice(formData: FormData): Promise<{ error?: string }> {
  const actor = await requireProductEditor();
  const productId = formData.get("productId") as string;
  const compareAtPriceNairaRaw = formData.get("compareAtPriceNaira");
  const compareAtPriceNaira = compareAtPriceNairaRaw ? Number(compareAtPriceNairaRaw) : null;
  if (!productId) return { error: "Missing product." };

  const before = await getProductSnapshot(productId);
  if (!before) return { error: "Product not found." };

  if (compareAtPriceNaira !== null) {
    if (!Number.isFinite(compareAtPriceNaira) || compareAtPriceNaira <= 0) {
      return { error: "Enter a valid amount." };
    }
    if (before.price_kobo != null && nairaToKobo(compareAtPriceNaira) <= before.price_kobo) {
      return { error: "The \"was\" price must be higher than the actual price." };
    }
  }

  const compareAtKobo = compareAtPriceNaira ? nairaToKobo(compareAtPriceNaira) : null;
  const { error } = await createServiceClient()
    .from("products")
    .update({ compare_at_price_kobo: compareAtKobo })
    .eq("id", productId);
  if (error) return { error: error.message };

  if (before.compare_at_price_kobo !== compareAtKobo) {
    const fmt = (k: number | null) => (k ? formatNaira(k) : "none");
    await logStaffActivity(actor, {
      action: "product.compare_at_price",
      entityType: "product",
      entityId: productId,
      summary: `"Was" price for ${before.name}: ${fmt(before.compare_at_price_kobo)} → ${fmt(compareAtKobo)}`,
      changes: { compare_at_price_kobo: { from: before.compare_at_price_kobo, to: compareAtKobo } },
    });
  }
  revalidateProduct(productId);
  return {};
}

/** Reassigns a product's category — the manual correction path for
 *  scripts/categorize-uncategorized.ts, which is keyword-matching on free
 *  text titles and won't always get it right. */
export async function assignProductCategory(formData: FormData): Promise<{ error?: string }> {
  const actor = await requireProductEditor();
  const productId = formData.get("productId") as string;
  const categoryId = formData.get("categoryId") as string;
  if (!productId) return { error: "Missing product." };
  if (!categoryId) return { error: "Missing category." };

  const before = await getProductSnapshot(productId);
  if (!before) return { error: "Product not found." };

  const { error } = await createServiceClient()
    .from("products")
    .update({ category_id: categoryId })
    .eq("id", productId);
  if (error) return { error: error.message };

  if (before.category_id !== categoryId) {
    const [from, to] = await Promise.all([
      lookupName("categories", before.category_id),
      lookupName("categories", categoryId),
    ]);
    await logStaffActivity(actor, {
      action: "product.category",
      entityType: "product",
      entityId: productId,
      summary: `Category for ${before.name}: ${from} → ${to}`,
      changes: { category_id: { from: before.category_id, to: categoryId } },
    });
  }
  revalidateProduct(productId);
  return {};
}

/** Toggles the hero-carousel / trending flags. Both are admin-curated, not
 *  computed — there's no order history yet to derive real "hot selling"
 *  data from (see the merchandising migration's comment). */
export async function toggleMerchandisingFlag(formData: FormData): Promise<{ error?: string }> {
  const actor = await requireProductEditor();
  const productId = formData.get("productId") as string;
  const field = formData.get("field") as string;
  const nextValue = formData.get("nextValue") === "true";
  if (!productId) return { error: "Missing product." };
  if (field !== "is_featured" && field !== "is_trending") {
    return { error: "Invalid field." };
  }

  const before = await getProductSnapshot(productId);
  if (!before) return { error: "Product not found." };

  const { error } = await createServiceClient()
    .from("products")
    .update({ [field]: nextValue })
    .eq("id", productId);
  if (error) return { error: error.message };

  const label = field === "is_featured" ? "hero" : "trending";
  await logStaffActivity(actor, {
    action: "product.merchandising",
    entityType: "product",
    entityId: productId,
    summary: `${nextValue ? "Added" : "Removed"} ${before.name} ${nextValue ? "to" : "from"} ${label}`,
    changes: { [field]: { from: before[field], to: nextValue } },
  });
  revalidateProduct(productId);
  return {};
}

/** Full content edit for any product regardless of status — the gap the
 *  original admin UI had: there was a way to price/publish a draft and
 *  toggle a few flags on a published product, but no way to actually
 *  rewrite a product's name/description once it existed. */
export async function updateProductDetails(formData: FormData): Promise<{ error?: string }> {
  const actor = await requireProductEditor();

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
    if (!Number.isFinite(priceNaira) || priceNaira <= 0) return { error: "Enter a valid price." };
    update.price_kobo = nairaToKobo(priceNaira);
  }
  if (stockQuantity !== null) {
    if (!Number.isInteger(stockQuantity) || stockQuantity < 0) return { error: "Enter a valid stock quantity." };
    update.stock_quantity = stockQuantity;
  }

  const before = await getProductSnapshot(productId);
  if (!before) return { error: "Product not found." };

  const { error } = await createServiceClient().from("products").update(update).eq("id", productId);
  if (error) return { error: error.message };

  const changes = diffFields(before, update);
  if (Object.keys(changes).length > 0) {
    const parts: string[] = [];
    if (changes.name) parts.push(`renamed to "${name}"`);
    if (changes.description) parts.push("description edited");
    if (changes.price_kobo) {
      parts.push(`price ${formatNaira((before.price_kobo as number | null) ?? 0)} → ${formatNaira(update.price_kobo as number)}`);
    }
    if (changes.stock_quantity) parts.push(`stock ${before.stock_quantity} → ${update.stock_quantity}`);
    if (changes.description) changes.description = { from: "(previous text)", to: "(new text)" };
    await logStaffActivity(actor, {
      action: "product.update",
      entityType: "product",
      entityId: productId,
      summary: `Edited ${before.name}: ${parts.join(", ")}`,
      changes,
    });
  }
  revalidateProduct(productId);
  return {};
}

export async function updateProductStatus(formData: FormData): Promise<{ error?: string }> {
  const actor = await requireProductEditor();
  const productId = formData.get("productId") as string;
  const status = formData.get("status") as string;
  if (!productId) return { error: "Missing product." };
  if (!["draft", "published", "archived"].includes(status)) return { error: "Invalid status." };

  const before = await getProductSnapshot(productId);
  if (!before) return { error: "Product not found." };

  const { error } = await createServiceClient().from("products").update({ status }).eq("id", productId);
  if (error) return { error: error.message };

  if (before.status !== status) {
    await logStaffActivity(actor, {
      action: "product.status",
      entityType: "product",
      entityId: productId,
      summary: `${before.name}: ${before.status} → ${status}`,
      changes: { status: { from: before.status, to: status } },
    });
  }
  revalidateProduct(productId);
  return {};
}

/** Uploads a new image or video to an existing product's gallery. Reuses
 *  the same "product-media" Supabase Storage bucket everything else in
 *  this project already writes to (the WooCommerce migration, the
 *  Instagram sync). */
export async function uploadProductImage(formData: FormData): Promise<{ error?: string }> {
  const actor = await requireProductEditor();

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

  const product = await getProductSnapshot(productId);
  await logStaffActivity(actor, {
    action: "product.media_add",
    entityType: "product",
    entityId: productId,
    summary: `Added ${isVideo ? "a video" : "an image"} to ${product?.name ?? "a product"}`,
    changes: { url: publicUrlData.publicUrl },
  });
  revalidateProduct(productId);
  return {};
}

export async function deleteProductImage(formData: FormData): Promise<{ error?: string }> {
  const actor = await requireProductEditor();
  const imageId = formData.get("imageId") as string;
  const productId = formData.get("productId") as string;
  if (!imageId) return { error: "Missing image." };

  const supabase = createServiceClient();

  const { data: image } = await supabase
    .from("product_images")
    .select("url, is_video, product_id")
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

  if (image) {
    const product = await getProductSnapshot(image.product_id);
    await logStaffActivity(actor, {
      action: "product.media_remove",
      entityType: "product",
      entityId: image.product_id,
      summary: `Removed ${image.is_video ? "a video" : "an image"} from ${product?.name ?? "a product"}`,
      changes: { url: image.url },
    });
  }

  if (productId) revalidateProduct(productId);
  return {};
}
