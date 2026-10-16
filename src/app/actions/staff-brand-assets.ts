"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireStaffAbility } from "@/lib/staff-session";
import { logStaffActivity } from "@/lib/activity-log";
import type { StaffSession } from "@/lib/staff-auth";

type Result = { error?: string };
type Placement = "top" | "bottom";

function requireBrandAssetEditor(): Promise<StaffSession> {
  return requireStaffAbility("manage_merchandising");
}

async function revalidateBrandAssets(brandSlug: string) {
  revalidatePath("/staff/dashboard/brand-assets");
  revalidatePath(`/brand/${brandSlug}`);
}

/** Uploads a new banner image for a brand's top or bottom picture strip to
 *  the "brand-media" Storage bucket, mirroring uploadProductImage
 *  (admin-products.ts) and uploadTeamMemberPhoto (staff-team-blog.ts). */
export async function uploadBrandBannerImage(formData: FormData): Promise<Result> {
  const actor = await requireBrandAssetEditor();

  const brandId = formData.get("brandId") as string;
  const brandSlug = formData.get("brandSlug") as string;
  const placement = formData.get("placement") as Placement;
  const file = formData.get("file") as File | null;

  if (!brandId || !brandSlug) return { error: "Missing brand." };
  if (placement !== "top" && placement !== "bottom") return { error: "Invalid placement." };
  if (!file || file.size === 0) return { error: "Choose an image first." };

  const supabase = createServiceClient();

  const { count } = await supabase
    .from("brand_banner_images")
    .select("*", { count: "exact", head: true })
    .eq("brand_id", brandId)
    .eq("placement", placement);

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `brands/${brandId}/${placement}/${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("brand-media")
    .upload(path, buffer, { contentType: file.type || undefined });
  if (uploadError) return { error: uploadError.message };

  const { data: publicUrlData } = supabase.storage.from("brand-media").getPublicUrl(path);

  const { error: insertError } = await supabase.from("brand_banner_images").insert({
    brand_id: brandId,
    placement,
    image_url: publicUrlData.publicUrl,
    position: count ?? 0,
  });
  if (insertError) return { error: insertError.message };

  await logStaffActivity(actor, {
    action: "brand_banner_image.add",
    entityType: "brand",
    entityId: brandId,
    summary: `Added a ${placement} banner image`,
  });
  await revalidateBrandAssets(brandSlug);
  return {};
}

export async function deleteBrandBannerImage(formData: FormData): Promise<Result> {
  const actor = await requireBrandAssetEditor();

  const id = formData.get("id") as string;
  const brandSlug = formData.get("brandSlug") as string;
  if (!id) return { error: "Missing image." };

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("brand_banner_images")
    .select("brand_id, placement, image_url")
    .eq("id", id)
    .maybeSingle();
  if (!data) return { error: "That image no longer exists." };

  await supabase.from("brand_banner_images").delete().eq("id", id);

  // Best-effort: also remove the uploaded file, not just the DB row.
  const marker = "/brand-media/";
  const idx = data.image_url.indexOf(marker);
  if (idx !== -1) {
    await supabase.storage.from("brand-media").remove([data.image_url.slice(idx + marker.length)]);
  }

  await logStaffActivity(actor, {
    action: "brand_banner_image.delete",
    entityType: "brand",
    entityId: data.brand_id,
    summary: `Removed a ${data.placement} banner image`,
  });
  await revalidateBrandAssets(brandSlug);
  return {};
}
