#!/usr/bin/env node
/**
 * Import the camerajoint.ng catalogue folder (built by
 * crawl-camerajoint-catalogue.py) into this store's database and storage.
 *
 * Plain ESM JavaScript on purpose: it runs ON THE VM, where the catalogue
 * files live and where only production dependencies are installed (no tsx,
 * no dotenv-cli). Node 20's --env-file covers the env:
 *
 *   node --env-file=.env.production.local scripts/import-catalogue.mjs \
 *        --catalogue /home/deploy/products-catalogue [--status draft|published]
 *        [--brand ulanzi] [--limit 20] [--dry-run] [--no-optimize]
 *
 * What it does, per product.json:
 *   - brand: matched to an existing brand by normalised name (so "K&F
 *     CONCEPT" lands on the existing "K&F Concept", not a duplicate);
 *     created if genuinely new.
 *   - category: mapped from the sister store's taxonomy onto ours (see
 *     CATEGORY_MAP); promo pseudo-categories like "DealZ" are ignored.
 *   - description: their HTML converted to plain text with paragraphs and
 *     bullets preserved — the product page renders description as text.
 *   - price: whole naira from the source (currency_minor_unit is 0 there)
 *     -> kobo. A higher regular_price becomes compare_at_price (a real,
 *     source-set "was" price, never fabricated).
 *   - stock: the source only exposes in_stock true/false, so in-stock items
 *     get the same STOCK_PLACEHOLDER the original WooCommerce import used.
 *     Flagged in the summary; adjust from the inventory page.
 *   - images: resized to max 1600px and re-encoded as WebP (q82) with sharp
 *     before upload — roughly a third of the original bytes, and faster on
 *     the storefront. First image = cover, order preserved.
 *
 * Idempotent: keyed on products.source_ref = "camerajoint:<id>". Re-running
 * skips imported products and tops up any images a crashed run missed.
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? dflt : args[i + 1];
};
const flag = (name) => args.includes(`--${name}`);

const CATALOGUE = opt("catalogue", "/home/deploy/products-catalogue");
const STATUS = opt("status", "draft");
const BRAND_FILTER = opt("brand", null);
const LIMIT = Number(opt("limit", 0)) || 0;
const DRY_RUN = flag("dry-run");
const OPTIMIZE = !flag("no-optimize");
const SOURCE = "camerajoint";
const STOCK_PLACEHOLDER = 20;
const IMAGE_CONCURRENCY = 8;
const MAX_IMAGE_PX = 1600;
const WEBP_QUALITY = 82;

if (!["draft", "published"].includes(STATUS)) {
  console.error(`--status must be draft or published, got "${STATUS}"`);
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(1);
}
const supabase = createClient(url, key);

// Sister-store category -> our category name. Anything not listed maps to
// "Uncategorized" for staff to place. LOW_PRIORITY entries are only used
// when a product has nothing better.
const CATEGORY_MAP = {
  Lenses: "Lenses & Filters",
  Cameras: "Cameras",
  "Tripod & Stands": "Mounts",
  Storage: "Storage",
  Microphones: "Audio",
  "Audio & Sound": "Audio",
  "Monitors & Transmitters": "Monitors & Transmitters",
  "Flash & Kits": "Lighting",
  "Soft Boxes": "Lighting",
  BackDrops: "Lighting",
  "Camera Bags & Cases": "Backpacks & Bags",
  Drones: "Drones",
  "Camera Batteries & Chargers": "Batteries & Chargers",
  Gimbals: "Gimbals & Stabilizers",
  "Action Cameras": "Action Cameras",
  "PTZ Cameras & Accessories": "PTZ Cameras",
  "Gaming & PC": "Digital & Electronic",
  "Webcam / Security": "Webcams & Security",
  "Camera Films": "Cameras",
  Accessories: "Rigs & Accessories",
  Others: "Rigs & Accessories",
};
const LOW_PRIORITY = new Set(["Accessories", "Others"]);
const IGNORED = new Set(["DealZ", "Combo deals"]);

function slugify(s) {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}
const normBrand = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** "GODOX" -> "Godox", but "DJI" and "K&F Concept" are left alone. */
function displayBrand(name) {
  const t = name.trim();
  if (t.length > 3 && t === t.toUpperCase() && /^[A-Z0-9 &.-]+$/.test(t)) {
    return t.toLowerCase().replace(/(^|[\s&-])([a-z])/g, (m, pre, ch) => pre + ch.toUpperCase());
  }
  return t;
}

function htmlToText(html) {
  if (!html) return "";
  let s = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|tr|table|ul|ol|blockquote)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/t[dh]>/gi, "  ")
    .replace(/<[^>]+>/g, "");
  s = s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)));
  return s
    .split("\n")
    .map((l) => l.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function pickCategory(names) {
  const usable = names.filter((n) => !IGNORED.has(n));
  const best = usable.find((n) => !LOW_PRIORITY.has(n)) ?? usable[0];
  return best ? CATEGORY_MAP[best] ?? "Uncategorized" : "Uncategorized";
}

async function ensureRows(table, wanted, existingRows, keyOf, makeRow) {
  const byKey = new Map(existingRows.map((r) => [keyOf(r.name), r]));
  for (const name of wanted) {
    const k = keyOf(name);
    if (byKey.has(k)) continue;
    const row = makeRow(name);
    if (DRY_RUN) {
      byKey.set(k, { id: `dry-${table}-${k}`, ...row });
      continue;
    }
    const { data, error } = await supabase.from(table).insert(row).select("id, name, slug").single();
    if (error) throw new Error(`${table} insert "${name}": ${error.message}`);
    byKey.set(k, data);
  }
  return byKey;
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

async function prepareImage(filePath) {
  const raw = fs.readFileSync(filePath);
  if (!OPTIMIZE) {
    const ext = path.extname(filePath).slice(1).toLowerCase() || "jpg";
    return { buffer: raw, ext: ext === "jpeg" ? "jpg" : ext, contentType: `image/${ext === "jpg" ? "jpeg" : ext}` };
  }
  const buffer = await sharp(raw)
    .rotate()
    .resize({ width: MAX_IMAGE_PX, height: MAX_IMAGE_PX, fit: "inside", withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
  return { buffer, ext: "webp", contentType: "image/webp" };
}

async function uploadImages(productId, folder, images, existingPositions) {
  const todo = images
    .map((img, position) => ({ img, position }))
    .filter(({ position }) => !existingPositions.has(position));
  const stats = { uploaded: 0, failed: 0, bytesIn: 0, bytesOut: 0 };
  await mapLimit(todo, IMAGE_CONCURRENCY, async ({ img, position }) => {
    const filePath = path.join(folder, img.file);
    try {
      if (!fs.existsSync(filePath)) throw new Error("file missing on disk");
      const { buffer, ext, contentType } = await prepareImage(filePath);
      stats.bytesIn += fs.statSync(filePath).size;
      stats.bytesOut += buffer.length;
      if (DRY_RUN) {
        stats.uploaded++;
        return;
      }
      const storagePath = `products/${productId}/${position}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("product-media")
        .upload(storagePath, buffer, { contentType, upsert: true });
      if (upErr) throw new Error(upErr.message);
      const { data: pub } = supabase.storage.from("product-media").getPublicUrl(storagePath);
      const { error: rowErr } = await supabase
        .from("product_images")
        .insert({ product_id: productId, url: pub.publicUrl, is_video: false, position });
      if (rowErr) throw new Error(rowErr.message);
      stats.uploaded++;
    } catch (e) {
      stats.failed++;
      console.warn(`    image ${img.file}: ${e.message}`);
    }
  });
  return stats;
}

async function main() {
  const index = JSON.parse(fs.readFileSync(path.join(CATALOGUE, "catalogue-index.json"), "utf8"));
  let items = index;
  if (BRAND_FILTER) items = items.filter((r) => r.folder.split("/")[0] === BRAND_FILTER);
  if (LIMIT) items = items.slice(0, LIMIT);
  console.log(
    `${items.length} products to import as ${STATUS}${DRY_RUN ? " (DRY RUN)" : ""}` +
      `${OPTIMIZE ? `, images -> ${MAX_IMAGE_PX}px WebP q${WEBP_QUALITY}` : ", images as-is"}`
  );

  const products = items.map((r) => {
    const folder = path.join(CATALOGUE, r.folder);
    return { folder, ...JSON.parse(fs.readFileSync(path.join(folder, "product.json"), "utf8")) };
  });

  // --- brands & categories ---------------------------------------------
  const [{ data: brandRows, error: bErr }, { data: catRows, error: cErr }] = await Promise.all([
    supabase.from("brands").select("id, name, slug"),
    supabase.from("categories").select("id, name, slug"),
  ]);
  if (bErr || cErr) throw new Error(bErr?.message ?? cErr?.message);

  const wantedBrands = [...new Set(products.map((p) => displayBrand(p.brand)))].filter(
    (b) => normBrand(b) !== "unbranded"
  );
  const brands = await ensureRows("brands", wantedBrands, brandRows, normBrand, (name) => ({
    name,
    slug: slugify(name),
  }));

  const wantedCats = [...new Set(products.map((p) => pickCategory(p.categories)))];
  // Match categories by normalised NAME, not slug: existing rows like
  // "Mounts" carry legacy slugs (tripods-and-mounts) that slugify() would
  // never reproduce, and we must not create a second "Mounts".
  const cats = await ensureRows("categories", wantedCats, catRows, normBrand, (name) => ({
    name,
    slug: slugify(name),
  }));
  const newBrands = wantedBrands.filter((b) => !brandRows.some((r) => normBrand(r.name) === normBrand(b)));
  const newCats = wantedCats.filter((c) => !catRows.some((r) => normBrand(r.name) === normBrand(c)));
  console.log(`brands: ${wantedBrands.length} used, ${newBrands.length} new (${newBrands.slice(0, 12).join(", ")}${newBrands.length > 12 ? ", …" : ""})`);
  console.log(`categories: ${wantedCats.length} used, ${newCats.length} new (${newCats.join(", ") || "none"})`);

  // --- products ----------------------------------------------------------
  const { data: existingRows } = await supabase
    .from("products")
    .select("id, slug, source_ref")
    .not("source_ref", "is", null);
  const existingByRef = new Map((existingRows ?? []).map((r) => [r.source_ref, r]));
  const { data: allSlugs } = await supabase.from("products").select("slug");
  const takenSlugs = new Set((allSlugs ?? []).map((r) => r.slug));

  const totals = { created: 0, skipped: 0, toppedUp: 0, failed: 0, placeholderStock: 0, withWasPrice: 0, imgUp: 0, imgFail: 0, bytesIn: 0, bytesOut: 0 };
  const t0 = Date.now();

  for (const [i, p] of products.entries()) {
    const sourceRef = `${SOURCE}:${p.source_id}`;
    const brandKey = normBrand(displayBrand(p.brand));
    const brandId = brandKey === "unbranded" ? null : (brands.get(brandKey)?.id ?? null);
    const categoryId = cats.get(normBrand(pickCategory(p.categories)))?.id ?? null;

    let productId;
    const existing = existingByRef.get(sourceRef);
    if (existing) {
      productId = existing.id;
      totals.skipped++;
    } else {
      const priceNaira = Number(p.price);
      const regularNaira = Number(p.regular_price);
      const price_kobo = Number.isFinite(priceNaira) && priceNaira > 0 ? Math.round(priceNaira * 100) : null;
      const compare_at_price_kobo =
        price_kobo && Number.isFinite(regularNaira) && regularNaira * 100 > price_kobo
          ? Math.round(regularNaira * 100)
          : null;
      if (compare_at_price_kobo) totals.withWasPrice++;
      const stock_quantity = p.in_stock ? STOCK_PLACEHOLDER : 0;
      if (p.in_stock) totals.placeholderStock++;
      const status = STATUS === "published" && price_kobo ? "published" : "draft";

      let slug = p.slug || slugify(p.name);
      if (takenSlugs.has(slug)) slug = `${slug}-cj`;
      takenSlugs.add(slug);

      const description = htmlToText(
        [p.short_description_html, p.description_html].filter(Boolean).join("\n\n")
      );

      const row = {
        name: p.name,
        slug,
        description: description || null,
        price_kobo,
        compare_at_price_kobo,
        stock_quantity,
        status,
        source: "catalogue_import",
        source_ref: sourceRef,
        category_id: categoryId,
        brand_id: brandId,
      };

      if (DRY_RUN) {
        productId = `dry-${p.source_id}`;
      } else {
        const { data, error } = await supabase.from("products").insert(row).select("id").single();
        if (error || !data) {
          totals.failed++;
          console.warn(`  FAILED "${p.name}": ${error?.message}`);
          continue;
        }
        productId = data.id;
      }
      totals.created++;
    }

    // Images: upload whatever positions aren't there yet.
    let existingPositions = new Set();
    if (existing && !DRY_RUN) {
      const { data: imgs } = await supabase.from("product_images").select("position").eq("product_id", productId);
      existingPositions = new Set((imgs ?? []).map((r) => r.position));
      if (existingPositions.size >= p.images.length) continue;
      totals.toppedUp++;
    }
    const s = await uploadImages(productId, p.folder, p.images, existingPositions);
    totals.imgUp += s.uploaded;
    totals.imgFail += s.failed;
    totals.bytesIn += s.bytesIn;
    totals.bytesOut += s.bytesOut;

    if ((i + 1) % 25 === 0 || i + 1 === products.length) {
      const mins = ((Date.now() - t0) / 60000).toFixed(1);
      console.log(`  ${i + 1}/${products.length}  created=${totals.created} skipped=${totals.skipped} images=${totals.imgUp} (${mins} min)`);
    }
  }

  const mb = (b) => (b / 1048576).toFixed(0);
  console.log(`\n--- Import summary (${STATUS}${DRY_RUN ? ", dry run" : ""}) ---`);
  console.log(`Products created:          ${totals.created}`);
  console.log(`Already imported, skipped: ${totals.skipped}${totals.toppedUp ? ` (${totals.toppedUp} had images topped up)` : ""}`);
  console.log(`Failed:                    ${totals.failed}`);
  console.log(`With real "was" price:     ${totals.withWasPrice}`);
  console.log(`Placeholder stock (=${STOCK_PLACEHOLDER}):  ${totals.placeholderStock}  (source only says in-stock yes/no)`);
  console.log(`Images uploaded:           ${totals.imgUp}   failed: ${totals.imgFail}`);
  console.log(`Image bytes:               ${mb(totals.bytesIn)} MB on disk -> ${mb(totals.bytesOut)} MB uploaded`);
}

main().catch((e) => {
  console.error("Import failed:", e);
  process.exit(1);
});
