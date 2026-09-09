/**
 * One-time cleanup: assigns a real category to every product currently
 * sitting in "Uncategorized" (179 as of writing), by keyword-matching the
 * product title against an ordered rule list — first matching rule wins,
 * so more specific/high-confidence patterns are listed before broader
 * catch-alls (e.g. "backpack" is checked before the generic tripod/mount
 * pattern, so "Camera Backpack" doesn't get miscategorized by a stray
 * "camera" mention).
 *
 * Same heuristic-over-free-text caveat as scripts/backfill-brands.ts:
 * this is pattern-matching on messy WooCommerce titles, not authoritative
 * data. Run with PREVIEW=1 (default) first to see the grouping without
 * writing anything, review it, then run with --apply to commit.
 *
 * Run with: npm run categorize:products          (preview only)
 *           npm run categorize:products -- --apply  (writes to the DB)
 */
import { createClient } from "@supabase/supabase-js";
import slugify from "slugify";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const APPLY = process.argv.includes("--apply");

// Ordered: first match wins. Deliberately specific before broad.
const RULES: { name: string; pattern: RegExp }[] = [
  { name: "Backpacks & Bags", pattern: /backpack|camera bag|shoulder bag|sling bag|crossbody|utility trolley|shopping cart/i },
  { name: "Drones", pattern: /\bdrone\b|dji neo|dji mini \d|dji mavic|dji air \d/i },
  { name: "Gimbals & Stabilizers", pattern: /gimbal|stabilizer|osmo mobile/i },
  { name: "Cameras", pattern: /mirrorless camera|instant camera|dslr|vlogging camera|action camera|osmo pocket|cinema camera|\bcamera \(/i },
  { name: "Microphones & Audio", pattern: /microphone|\bmic\b|lavalier|audio system/i },
  {
    name: "Lighting",
    // Includes Godox's bare flash/strobe model codes (V850, V860, Ving,
    // TT520/685/600, AD200/300/600 "Pro") and Sutefoto (a lighting-only
    // brand) — both show up in this catalogue as bare model names with no
    // "light"/"flash" word in the title at all (e.g. "Godox V850 II",
    // "Sutefoto P100 RGB"), confirmed by inspecting the actual titles.
    pattern: /led .*light|video light|studio light|softbox|octabox|reflector|speedlite|\bflash\b|strobe|barndoor|cob (video|light)|panel light|tube ?light|light stick|light wand|cube light|^sutefoto|\bving\b|\bv8[5-6]0\b|\btt\d{3}\b|\bad\d{2,3}(pro)?\b/i,
  },
  { name: "Lenses & Filters", pattern: /lens filter|nd filter|\blens\b|prime lens/i },
  { name: "Memory Cards & Storage", pattern: /memory card|sdxc|microsd|cfexpress|portable ssd|card reader/i },
  { name: "Tripods & Mounts", pattern: /tripod|monopod|magic arm|ball head|quick.release|cold shoe|desk mount|selfie stick|phone holder|phone stand|camera stand/i },
  { name: "Rigs & Accessories", pattern: /.*/ }, // catch-all: fog machine, remotes, clips, cages, adapters, screws, cooling kits
];

function categorize(title: string): string {
  for (const rule of RULES) {
    if (rule.pattern.test(title)) return rule.name;
  }
  return "Rigs & Accessories";
}

async function main() {
  const { data: uncategorized, error } = await supabase
    .from("products")
    .select("id, name, category:categories!inner(slug)")
    .eq("categories.slug", "uncategorized");

  if (error) throw error;
  if (!uncategorized || uncategorized.length === 0) {
    console.log("No uncategorized products found.");
    return;
  }

  const groups = new Map<string, { id: string; name: string }[]>();
  for (const p of uncategorized) {
    const category = categorize(p.name);
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category)!.push({ id: p.id, name: p.name });
  }

  console.log(`--- ${APPLY ? "APPLYING" : "PREVIEW"}: ${uncategorized.length} uncategorized products ---\n`);

  for (const [category, items] of groups) {
    console.log(`${category} (${items.length}):`);
    for (const item of items.slice(0, 8)) console.log(`  - ${item.name}`);
    if (items.length > 8) console.log(`  ... and ${items.length - 8} more`);
    console.log();
  }

  if (!APPLY) {
    console.log("Preview only — no changes written. Re-run with --apply to commit.");
    return;
  }

  const categoryIdCache = new Map<string, string>();

  for (const [categoryName, items] of groups) {
    let categoryId = categoryIdCache.get(categoryName);
    if (!categoryId) {
      const slug = slugify(categoryName, { lower: true, strict: true });
      const { data: existing } = await supabase
        .from("categories")
        .select("id")
        .eq("name", categoryName)
        .maybeSingle();

      if (existing) {
        categoryId = existing.id;
      } else {
        const { data: created, error: createError } = await supabase
          .from("categories")
          .insert({ name: categoryName, slug })
          .select("id")
          .single();
        if (createError || !created) {
          console.error(`Failed to create category "${categoryName}":`, createError?.message);
          continue;
        }
        categoryId = created.id;
      }
      if (!categoryId) continue;
      categoryIdCache.set(categoryName, categoryId);
    }
    if (!categoryId) continue;

    const ids = items.map((i) => i.id);
    const { error: updateError } = await supabase
      .from("products")
      .update({ category_id: categoryId })
      .in("id", ids);

    if (updateError) {
      console.error(`Failed to update ${categoryName}:`, updateError.message);
    }
  }

  console.log("Applied.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
