/**
 * One-time seed for the homepage "Hot Selling" shelf: marks a hand-picked
 * hero product per brand as is_featured so the shelf stops falling back to
 * "newest published" (which made it a mirror of New Arrivals). The picks
 * are deliberate — one flagship per manufacturer, all in stock with photos
 * at the time of writing — and anyone can change them afterwards from the
 * merchandising toggles on /admin/products or /staff/dashboard/products.
 *
 * Run with: npm run feature:products
 */
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FEATURED_SLUG_PREFIXES = [
  "sony-alpha-a7-iv",
  "dji-rs-4-pro",
  "canon-eos-r50",
  "godox-ad300pro",
  "hollyland-lark-m2-wireless",
  "lexar-4tb-sl500",
  "fujifilm-instax-mini-evo-hybrid-instant-camera-black",
  "ulanzi-video-fast-carbon-fibre",
];

async function main() {
  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, slug, is_featured, stock_quantity")
    .eq("status", "published");
  if (error) throw error;

  const picks = FEATURED_SLUG_PREFIXES.map((prefix) => {
    const match = (products ?? []).find((p) => p.slug.startsWith(prefix));
    if (!match) console.warn(`no published product matches "${prefix}"`);
    return match;
  }).filter((p): p is NonNullable<typeof p> => Boolean(p));

  for (const p of picks) {
    if (p.is_featured) {
      console.log(`already featured: ${p.name}`);
      continue;
    }
    const { error: updateError } = await supabase
      .from("products")
      .update({ is_featured: true })
      .eq("id", p.id);
    if (updateError) throw updateError;
    console.log(`featured: ${p.name}`);
  }
  console.log(`done — ${picks.length} of ${FEATURED_SLUG_PREFIXES.length} picks applied`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
