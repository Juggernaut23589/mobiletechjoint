/**
 * One-time migration: WooCommerce (mobiletechjoint.com, exported to
 * /tmp/mtj-products-export.json via scripts/export_products.php on the
 * server) -> this project's Supabase schema.
 *
 * Run with: npm run migrate:woocommerce
 *
 * What this does, and why, per findings from the earlier site audit and
 * the export itself:
 *   - Strips "in Lagos, Nigeria" / city-name SEO stuffing from titles and
 *     descriptions (confirmed present in every stuffed title via the export).
 *   - Fixes the "Adaptars" -> "Adapters" misspelling found in the audit.
 *   - Consolidates categories to the 4 real primary categories found in
 *     the export (WooCommerce's `product_cat` allows multiple; we take the
 *     product's first/primary one, same as the live theme's "shop by
 *     category" links did).
 *   - Products with manage_stock=false (320 of 324) don't have a real
 *     WooCommerce quantity — only an instock/outofstock/onbackorder flag.
 *     Importing 0 for all of them would make the whole catalogue
 *     unpurchasable. Mapped to a placeholder quantity instead (see
 *     STOCK_PLACEHOLDER below) so "instock" products are actually
 *     buyable; flagged in the run summary so real counts can be entered later.
 *   - Products with no price (31 found) import as DRAFT, never published —
 *     enforced anyway by the DB's price_required_when_published constraint,
 *     but rejected before hitting it so the run reports them clearly.
 *   - Every image is DOWNLOADED from the WordPress site and RE-UPLOADED to
 *     this project's own Supabase Storage bucket. Never point at the
 *     WooCommerce site's URLs directly — that site is a separate,
 *     previously-compromised piece of infrastructure (see
 *     project_mobiletechjoint memory) that we don't want this store's
 *     uptime depending on.
 */

import { createClient } from "@supabase/supabase-js";
import slugify from "slugify";
import fs from "node:fs";

const EXPORT_PATH = "/tmp/mtj-products-export.json";

// See the audit note above: instock/onbackorder products with no tracked
// quantity get this placeholder so they're purchasable. This is a known
// approximation, not real inventory data — flagged in the summary.
const STOCK_PLACEHOLDER = 20;

const CATEGORY_FIXES: Record<string, string> = {
  Adaptars: "Adapters",
  "Digital &amp; Electronic": "Digital & Electronic",
  "All Products": "Uncategorized", // not a real category, just WooCommerce's catch-all
};

interface WooProduct {
  woocommerce_id: number;
  name: string;
  description: string;
  price_kobo: number | null;
  stock_quantity: number;
  manage_stock: boolean;
  stock_status: "instock" | "outofstock" | "onbackorder";
  sku: string;
  category: string | null;
  images: string[];
}

function cleanText(text: string): string {
  return text
    .replace(/\s+in Lagos,?\s*Nigeria\.?/gi, "")
    .replace(/\s+in (Ikeja|Lekki|Victoria Island|VI|Surulere|Abuja|Port Harcourt)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function resolveCategory(raw: string | null): string {
  if (!raw) return "Uncategorized";
  return CATEGORY_FIXES[raw] ?? raw;
}

function resolveStockQuantity(p: WooProduct): number {
  if (p.manage_stock && p.stock_quantity > 0) return p.stock_quantity;
  if (p.stock_status === "instock" || p.stock_status === "onbackorder") {
    return STOCK_PLACEHOLDER;
  }
  return 0; // stock_status === 'outofstock'
}

async function main() {
  if (!fs.existsSync(EXPORT_PATH)) {
    console.error(`Export file not found at ${EXPORT_PATH}.`);
    console.error("Run scripts/export_products.php on the server first, then scp it down.");
    process.exit(1);
  }

  const products: WooProduct[] = JSON.parse(fs.readFileSync(EXPORT_PATH, "utf-8"));
  console.log(`Loaded ${products.length} products from export.`);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
    process.exit(1);
  }
  const supabase = createClient(url, serviceKey);

  // --- 1. Categories -------------------------------------------------
  const categoryNames = Array.from(
    new Set(products.map((p) => resolveCategory(p.category)))
  );
  const categoryIdByName = new Map<string, string>();

  for (const name of categoryNames) {
    const slug = slugify(name, { lower: true, strict: true });
    const { data: existing } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (existing) {
      categoryIdByName.set(name, existing.id);
      continue;
    }

    const { data: inserted, error } = await supabase
      .from("categories")
      .insert({ name, slug })
      .select("id")
      .single();

    if (error || !inserted) {
      console.error(`Failed to create category "${name}":`, error?.message);
      process.exit(1);
    }
    categoryIdByName.set(name, inserted.id);
  }
  console.log(`Categories ready: ${categoryNames.join(", ")}`);

  // --- 2. Products + images ------------------------------------------
  let published = 0;
  let draftedNoPrice = 0;
  let placeholderStockCount = 0;
  let imagesUploaded = 0;
  let imagesFailed = 0;
  let skippedExisting = 0;

  for (const [i, p] of products.entries()) {
    const { data: alreadyImported } = await supabase
      .from("products")
      .select("id")
      .eq("woocommerce_id", p.woocommerce_id)
      .maybeSingle();

    if (alreadyImported) {
      skippedExisting++;
      continue;
    }

    const name = cleanText(p.name);
    const description = cleanText(p.description);
    const slugBase = slugify(name, { lower: true, strict: true });
    const slug = `${slugBase}-${p.woocommerce_id}`; // guarantee uniqueness across 324 items
    const categoryName = resolveCategory(p.category);
    const categoryId = categoryIdByName.get(categoryName) ?? null;
    const stockQuantity = resolveStockQuantity(p);
    const isPlaceholderStock = !p.manage_stock && stockQuantity === STOCK_PLACEHOLDER;
    const status = p.price_kobo != null ? "published" : "draft";

    if (status === "draft") draftedNoPrice++;
    else published++;
    if (isPlaceholderStock) placeholderStockCount++;

    const { data: inserted, error } = await supabase
      .from("products")
      .insert({
        name,
        slug,
        description,
        price_kobo: p.price_kobo,
        category_id: categoryId,
        stock_quantity: stockQuantity,
        status,
        source: "woocommerce_import",
        woocommerce_id: p.woocommerce_id,
      })
      .select("id")
      .single();

    if (error || !inserted) {
      console.error(`Failed to insert product "${name}" (WC#${p.woocommerce_id}):`, error?.message);
      continue;
    }

    // Download + re-upload each image, preserving order.
    for (const [position, imageUrl] of p.images.entries()) {
      try {
        const res = await fetch(imageUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buffer = Buffer.from(await res.arrayBuffer());
        const contentType = res.headers.get("content-type") ?? "image/jpeg";
        const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
        const storagePath = `products/${inserted.id}/${position}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("product-media")
          .upload(storagePath, buffer, { contentType, upsert: true });

        if (uploadError) throw new Error(uploadError.message);

        const { data: publicUrlData } = supabase.storage
          .from("product-media")
          .getPublicUrl(storagePath);

        await supabase.from("product_images").insert({
          product_id: inserted.id,
          url: publicUrlData.publicUrl,
          is_video: false,
          position,
        });

        imagesUploaded++;
      } catch (err) {
        imagesFailed++;
        console.warn(`  image failed for "${name}" (${imageUrl}):`, (err as Error).message);
      }
    }

    if ((i + 1) % 25 === 0) {
      console.log(`  ...${i + 1}/${products.length} processed`);
    }
  }

  console.log("\n--- Migration summary ---");
  console.log(`Published:                ${published}`);
  console.log(`Drafted (no price):       ${draftedNoPrice}`);
  console.log(`Skipped (already there):  ${skippedExisting}`);
  console.log(`Placeholder stock used:   ${placeholderStockCount}  (real qty unknown — WooCommerce wasn't tracking it)`);
  console.log(`Images uploaded:          ${imagesUploaded}`);
  console.log(`Images failed:            ${imagesFailed}`);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
