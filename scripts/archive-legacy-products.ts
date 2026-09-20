/**
 * Retire the pre-catalogue products: everything NOT created by
 * scripts/import-catalogue.mjs (i.e. source_ref IS NULL) is set to
 * status='archived'. Archived rows keep their data and images and drop
 * out of the storefront — reversible with a status change, nothing is
 * deleted.
 *
 * Run with: npm run archive:legacy -- --yes   (without --yes it only reports)
 */
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const APPLY = process.argv.includes("--yes");

async function count(filter: (q: any) => any) {
  const { count } = await filter(supabase.from("products").select("id", { count: "exact", head: true }));
  return count ?? 0;
}

async function main() {
  const legacyLive = await count((q: any) => q.is("source_ref", null).neq("status", "archived"));
  const importedLive = await count((q: any) => q.not("source_ref", "is", null).eq("status", "published"));
  console.log(`legacy products still live (source_ref IS NULL, not archived): ${legacyLive}`);
  console.log(`imported products published:                                ${importedLive}`);

  if (!APPLY) {
    console.log("\nDry run — pass --yes to archive the legacy set.");
    return;
  }

  const { data, error } = await supabase
    .from("products")
    .update({ status: "archived" })
    .is("source_ref", null)
    .neq("status", "archived")
    .select("id");
  if (error) throw error;

  console.log(`\narchived: ${data?.length ?? 0}`);
  console.log(`legacy still live after: ${await count((q: any) => q.is("source_ref", null).neq("status", "archived"))}`);
  console.log(`imported still published: ${await count((q: any) => q.not("source_ref", "is", null).eq("status", "published"))}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
