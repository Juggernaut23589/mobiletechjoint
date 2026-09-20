/**
 * One-time seed for the homepage "Hot Selling" shelf: marks a hand-picked
 * hero product per brand as is_featured so the shelf stops falling back to
 * "newest published" (which made it a mirror of New Arrivals). The picks
 * are deliberate — one flagship per manufacturer, all in stock with photos
 * at the time of writing — and anyone can change them afterwards from the
 * merchandising toggles on /admin/products or /staff/dashboard/products.
 *
 * Re-pointed at the camerajoint catalogue after the legacy products were
 * archived (the original eight picks were all legacy rows).
 *
 * Run with: npm run feature:products
 */
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FEATURED_SLUG_PREFIXES = [
  "sony-fx6-full-frame-cinema-camera",
  "nikon-z8-mirrorless-camera",
  "dji-air-3s-drone-with-rc-2-fly-more-combo",
  "godox-ad600pro-ii-all-in-one-outdoor-flash",
  "rode-rodecaster-pro-ii-integrated-audio",
  "fujifilm-x-h2s-mirrorless-camera",
  "insta360-x6-8k-360-camera-essentials-bundle",
  "ulanzi-jj06-glidego-video-tripod",
];

async function main() {
  // One query per pick: a blanket select of all published products caps
  // at Supabase's default 1000-row page, which silently dropped matches
  // once the catalogue passed that size.
  let applied = 0;
  for (const prefix of FEATURED_SLUG_PREFIXES) {
    const { data: matches, error } = await supabase
      .from("products")
      .select("id, name, slug, is_featured")
      .eq("status", "published")
      .like("slug", `${prefix}%`)
      .order("slug")
      .limit(1);
    if (error) throw error;
    const p = matches?.[0];
    if (!p) {
      console.warn(`no published product matches "${prefix}"`);
      continue;
    }
    if (p.is_featured) {
      console.log(`already featured: ${p.name}`);
      applied++;
      continue;
    }
    const { error: updateError } = await supabase
      .from("products")
      .update({ is_featured: true })
      .eq("id", p.id);
    if (updateError) throw updateError;
    console.log(`featured: ${p.name}`);
    applied++;
  }
  console.log(`done — ${applied} of ${FEATURED_SLUG_PREFIXES.length} picks applied`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
