"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireStaffAbility } from "@/lib/staff-session";
import { logStaffActivity } from "@/lib/activity-log";
import type { StaffSession } from "@/lib/staff-auth";

type Result = { error?: string };

const HERO_BRAND_LIMIT = 10;

function requireHeroBrandEditor(): Promise<StaffSession> {
  return requireStaffAbility("manage_merchandising");
}

function revalidateHeroBrands() {
  revalidatePath("/staff/dashboard/banners");
  revalidatePath("/");
}

/** Adds a brand to the homepage hero carousel's "brand showcase" slides —
 *  same add/remove pattern as homepage banners and the Shop by Brand
 *  shelves, just picking a brand for a different carousel slot. The
 *  10-slide cap is enforced here for a fast error and again by a DB
 *  trigger (homepage_hero_brands migration) so it holds regardless of
 *  what inserts the row. */
export async function addHeroBrand(formData: FormData): Promise<Result> {
  const actor = await requireHeroBrandEditor();

  const brandId = formData.get("brandId") as string;
  if (!brandId) return { error: "Missing brand." };

  const supabase = createServiceClient();

  const { count } = await supabase
    .from("homepage_hero_brands")
    .select("*", { count: "exact", head: true });
  if ((count ?? 0) >= HERO_BRAND_LIMIT) {
    return { error: `Only ${HERO_BRAND_LIMIT} hero brand slides are allowed — remove one first.` };
  }

  const { data: brand } = await supabase.from("brands").select("name").eq("id", brandId).maybeSingle();
  if (!brand) return { error: "That brand no longer exists." };

  const { error } = await supabase
    .from("homepage_hero_brands")
    .insert({ brand_id: brandId, position: count ?? 0 });
  if (error) {
    if (error.code === "23505") return { error: "That brand already has a hero slide." };
    return { error: error.message };
  }

  await logStaffActivity(actor, {
    action: "homepage_hero_brand.add",
    entityType: "homepage_brand_shelf",
    summary: `Added ${brand.name} to the homepage hero carousel`,
  });
  revalidateHeroBrands();
  return {};
}

export async function removeHeroBrand(formData: FormData): Promise<Result> {
  const actor = await requireHeroBrandEditor();

  const brandId = formData.get("brandId") as string;
  if (!brandId) return { error: "Missing brand." };

  const supabase = createServiceClient();
  const { data: brand } = await supabase.from("brands").select("name").eq("id", brandId).maybeSingle();

  await supabase.from("homepage_hero_brands").delete().eq("brand_id", brandId);

  await logStaffActivity(actor, {
    action: "homepage_hero_brand.remove",
    entityType: "homepage_brand_shelf",
    summary: `Removed ${brand?.name ?? "a brand"} from the homepage hero carousel`,
  });
  revalidateHeroBrands();
  return {};
}
