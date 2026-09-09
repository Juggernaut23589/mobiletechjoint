/**
 * One-time backfill: assigns products.brand_id by matching a known
 * manufacturer name against the START of the product title only — not
 * "contains" anywhere in the title. That distinction matters: this
 * catalogue has titles like "Ulanzi Camera Cooler Kit ... for Sony Canon
 * Fujifilm" (a Ulanzi accessory that's compatible with those cameras, not
 * a Sony/Canon/Fujifilm product) alongside real "Sony ZV-E10 Mirrorless
 * Camera..." titles. Matching only the first word(s) correctly separates
 * the two, confirmed by inspecting the actual title data before writing
 * this list — see the chat history for the verification queries.
 *
 * This is inherently a heuristic over free-text titles, not authoritative
 * manufacturer data (WooCommerce/Dukamarket had no brand taxonomy to
 * import from). Anything that doesn't match stays brand_id=null — an
 * admin can set it manually from /admin/products' brand dropdown.
 *
 * Run with: npm run backfill:brands
 */
import { createClient } from "@supabase/supabase-js";
import slugify from "slugify";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Ordered longest-prefix-first where one brand name is a prefix of another
// scenario doesn't apply here, but keeping it explicit/ordered avoids any
// future footgun. "DGX" is Godox's own sub-line for studio COB/LED lights
// (titles like "DGX FF Series 300 Watts Light") — mapped to the same
// Godox brand, not treated as a separate manufacturer.
const KNOWN_BRANDS: { match: string; brand: string }[] = [
  { match: "Ulanzi", brand: "Ulanzi" },
  { match: "DJI", brand: "DJI" },
  { match: "Godox", brand: "Godox" },
  { match: "DGX", brand: "Godox" },
  { match: "Lexar", brand: "Lexar" },
  { match: "Hollyland", brand: "Hollyland" },
  { match: "Sandisk", brand: "SanDisk" },
  { match: "Fujifilm", brand: "Fujifilm" },
  { match: "Sony", brand: "Sony" },
  { match: "Canon", brand: "Canon" },
  { match: "Nikon", brand: "Nikon" },
  { match: "Falcam", brand: "Falcam" },
  { match: "K&F", brand: "K&F Concept" },
  { match: "Joby", brand: "Joby" },
  { match: "Viltrox", brand: "Viltrox" },
];

function detectBrand(title: string): string | null {
  for (const { match, brand } of KNOWN_BRANDS) {
    if (title.toLowerCase().startsWith(match.toLowerCase())) return brand;
  }
  return null;
}

async function main() {
  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, brand_id")
    .is("brand_id", null);

  if (error) throw error;
  if (!products || products.length === 0) {
    console.log("No products with a null brand_id — nothing to do.");
    return;
  }

  const brandCache = new Map<string, string>(); // brand name -> id

  let matched = 0;
  let unmatched = 0;

  for (const product of products) {
    const brandName = detectBrand(product.name);
    if (!brandName) {
      unmatched++;
      continue;
    }

    let brandId = brandCache.get(brandName);
    if (!brandId) {
      const slug = slugify(brandName, { lower: true, strict: true });
      const { data: existing } = await supabase
        .from("brands")
        .select("id")
        .eq("name", brandName)
        .maybeSingle();

      if (existing) {
        brandId = existing.id;
      } else {
        const { data: created, error: createError } = await supabase
          .from("brands")
          .insert({ name: brandName, slug })
          .select("id")
          .single();
        if (createError || !created) {
          console.error(`Failed to create brand "${brandName}":`, createError?.message);
          continue;
        }
        brandId = created.id;
      }
      if (!brandId) continue;
      brandCache.set(brandName, brandId);
    }
    if (!brandId) continue;

    const { error: updateError } = await supabase
      .from("products")
      .update({ brand_id: brandId })
      .eq("id", product.id);

    if (updateError) {
      console.error(`Failed to update product ${product.id}:`, updateError.message);
      continue;
    }
    matched++;
  }

  console.log("--- Brand backfill summary ---");
  console.log(`Matched:    ${matched}`);
  console.log(`Unmatched:  ${unmatched} (left brand_id=null — fix manually in /admin/products if needed)`);
  console.log(`Brands used: ${Array.from(brandCache.keys()).join(", ")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
