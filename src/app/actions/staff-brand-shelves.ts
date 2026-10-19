"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireStaffAbility } from "@/lib/staff-session";
import { logStaffActivity } from "@/lib/activity-log";
import type { StaffSession } from "@/lib/staff-auth";

type Result = { error?: string };

const SHELF_LIMIT = 6;

function requireShelfEditor(): Promise<StaffSession> {
  return requireStaffAbility("manage_merchandising");
}

function revalidateShelves() {
  revalidatePath("/staff/dashboard/brand-shelves");
  revalidatePath("/");
}

/** Adds a brand to the homepage's "Shop by brand" shelves — same
 *  add/remove pattern as homepage banners and ad placements, just picking
 *  a brand instead of uploading media. The 6-shelf cap is enforced here
 *  for a fast error and again by a DB trigger (homepage_curation
 *  migration) so it holds regardless of what inserts the row. */
export async function addBrandShelf(formData: FormData): Promise<Result> {
  const actor = await requireShelfEditor();

  const brandId = formData.get("brandId") as string;
  if (!brandId) return { error: "Missing brand." };

  const supabase = createServiceClient();

  const { count } = await supabase
    .from("homepage_brand_shelves")
    .select("*", { count: "exact", head: true });
  if ((count ?? 0) >= SHELF_LIMIT) {
    return { error: `Only ${SHELF_LIMIT} shelves are allowed — remove one first.` };
  }

  const { data: brand } = await supabase.from("brands").select("name").eq("id", brandId).maybeSingle();
  if (!brand) return { error: "That brand no longer exists." };

  const { error } = await supabase
    .from("homepage_brand_shelves")
    .insert({ brand_id: brandId, position: count ?? 0 });
  if (error) {
    if (error.code === "23505") return { error: "That brand is already a homepage shelf." };
    return { error: error.message };
  }

  await logStaffActivity(actor, {
    action: "homepage_brand_shelf.add",
    entityType: "homepage_brand_shelf",
    summary: `Added ${brand.name} to the homepage brand shelves`,
  });
  revalidateShelves();
  return {};
}

export async function removeBrandShelf(formData: FormData): Promise<Result> {
  const actor = await requireShelfEditor();

  const brandId = formData.get("brandId") as string;
  if (!brandId) return { error: "Missing brand." };

  const supabase = createServiceClient();
  const { data: brand } = await supabase.from("brands").select("name").eq("id", brandId).maybeSingle();

  await supabase.from("homepage_brand_shelves").delete().eq("brand_id", brandId);

  await logStaffActivity(actor, {
    action: "homepage_brand_shelf.remove",
    entityType: "homepage_brand_shelf",
    summary: `Removed ${brand?.name ?? "a brand"} from the homepage brand shelves`,
  });
  revalidateShelves();
  return {};
}
