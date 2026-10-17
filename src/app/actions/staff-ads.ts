"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireStaffAbility } from "@/lib/staff-session";
import { logStaffActivity } from "@/lib/activity-log";
import type { StaffSession } from "@/lib/staff-auth";

type Result = { error?: string };
type Placement = "homepage" | "brand";

const BRAND_AD_LIMIT = 2;

function requireAdEditor(): Promise<StaffSession> {
  return requireStaffAbility("manage_merchandising");
}

function revalidateAds(placement: Placement, brandSlug?: string) {
  revalidatePath("/staff/dashboard/ad-placements");
  if (placement === "homepage") {
    revalidatePath("/");
  } else {
    // Brand ads show on every product page for that brand — there's no
    // single path to target, so revalidate the whole /products tree (same
    // approach revalidateProduct in admin-products.ts already uses) plus
    // the brand page itself.
    revalidatePath("/products", "layout");
    if (brandSlug) revalidatePath(`/brand/${brandSlug}`);
  }
}

/** Uploads a new ad image to the "ad-media" Storage bucket, mirroring
 *  uploadBrandBannerImage (staff-brand-assets.ts). Homepage ads have no
 *  brand; brand ads require one. */
export async function uploadAd(formData: FormData): Promise<Result> {
  const actor = await requireAdEditor();

  const placement = formData.get("placement") as Placement;
  const brandId = (formData.get("brandId") as string) || null;
  const brandSlug = (formData.get("brandSlug") as string) || undefined;
  const caption = ((formData.get("caption") as string) || "").trim();
  const linkUrl = ((formData.get("linkUrl") as string) || "").trim();
  const file = formData.get("file") as File | null;

  if (placement !== "homepage" && placement !== "brand") return { error: "Invalid placement." };
  if (placement === "brand" && !brandId) return { error: "Choose a brand." };
  if (!file || file.size === 0) return { error: "Choose an image first." };
  if (!caption) return { error: "A caption is required before an ad can be published." };
  if (!linkUrl) return { error: "A link is required before an ad can be published." };

  const supabase = createServiceClient();

  const countQuery = supabase
    .from("ad_placements")
    .select("*", { count: "exact", head: true })
    .eq("placement", placement);
  const { count } = placement === "brand" ? await countQuery.eq("brand_id", brandId) : await countQuery.is("brand_id", null);

  if (placement === "brand" && (count ?? 0) >= BRAND_AD_LIMIT) {
    return { error: `Only ${BRAND_AD_LIMIT} brand ads are allowed per brand — remove one first.` };
  }

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `ads/${placement}/${brandId ?? "homepage"}/${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("ad-media")
    .upload(path, buffer, { contentType: file.type || undefined });
  if (uploadError) return { error: uploadError.message };

  const { data: publicUrlData } = supabase.storage.from("ad-media").getPublicUrl(path);

  const { error: insertError } = await supabase.from("ad_placements").insert({
    placement,
    brand_id: placement === "brand" ? brandId : null,
    image_url: publicUrlData.publicUrl,
    caption,
    link_url: linkUrl,
    position: count ?? 0,
  });
  if (insertError) return { error: insertError.message };

  await logStaffActivity(actor, {
    action: "ad_placement.add",
    entityType: "ad_placement",
    entityId: brandId ?? undefined,
    summary: `Added a ${placement} ad`,
  });
  revalidateAds(placement, brandSlug);
  return {};
}

export async function deleteAd(formData: FormData): Promise<Result> {
  const actor = await requireAdEditor();

  const id = formData.get("id") as string;
  const brandSlug = (formData.get("brandSlug") as string) || undefined;
  if (!id) return { error: "Missing ad." };

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("ad_placements")
    .select("placement, brand_id, image_url")
    .eq("id", id)
    .maybeSingle();
  if (!data) return { error: "That ad no longer exists." };

  await supabase.from("ad_placements").delete().eq("id", id);

  // Best-effort: also remove the uploaded file, not just the DB row.
  const marker = "/ad-media/";
  const idx = data.image_url.indexOf(marker);
  if (idx !== -1) {
    await supabase.storage.from("ad-media").remove([data.image_url.slice(idx + marker.length)]);
  }

  await logStaffActivity(actor, {
    action: "ad_placement.delete",
    entityType: "ad_placement",
    entityId: data.brand_id ?? undefined,
    summary: `Removed a ${data.placement} ad`,
  });
  revalidateAds(data.placement as Placement, brandSlug);
  return {};
}
