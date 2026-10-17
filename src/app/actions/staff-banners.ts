"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireStaffAbility } from "@/lib/staff-session";
import { logStaffActivity } from "@/lib/activity-log";
import type { StaffSession } from "@/lib/staff-auth";

type Result = { error?: string };

const BANNER_LIMIT = 10;

function requireBannerEditor(): Promise<StaffSession> {
  return requireStaffAbility("manage_merchandising");
}

function revalidateBanners() {
  revalidatePath("/staff/dashboard/banners");
  revalidatePath("/");
}

/** Uploads a new homepage hero banner to the "banner-media" Storage
 *  bucket, same upload/delete pattern as uploadBrandBannerImage and
 *  uploadAd. Rendered full-bleed in the same box the hero carousel's
 *  intro/brand slides already use — see getHomepageBanners (products.ts)
 *  and HeroCarousel.tsx. The 10-banner cap is enforced here for a fast
 *  error and again by a DB trigger (homepage_banners migration) so it
 *  holds regardless of what inserts the row. */
export async function uploadBanner(formData: FormData): Promise<Result> {
  const actor = await requireBannerEditor();

  const linkUrl = ((formData.get("linkUrl") as string) || "").trim() || null;
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "Choose an image first." };

  const supabase = createServiceClient();

  const { count } = await supabase
    .from("homepage_banners")
    .select("*", { count: "exact", head: true });
  if ((count ?? 0) >= BANNER_LIMIT) {
    return { error: `Only ${BANNER_LIMIT} banners are allowed — remove one first.` };
  }

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `banners/${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("banner-media")
    .upload(path, buffer, { contentType: file.type || undefined });
  if (uploadError) return { error: uploadError.message };

  const { data: publicUrlData } = supabase.storage.from("banner-media").getPublicUrl(path);

  const { error: insertError } = await supabase.from("homepage_banners").insert({
    image_url: publicUrlData.publicUrl,
    link_url: linkUrl,
    position: count ?? 0,
  });
  if (insertError) return { error: insertError.message };

  await logStaffActivity(actor, {
    action: "homepage_banner.add",
    entityType: "homepage_banner",
    summary: "Added a homepage banner",
  });
  revalidateBanners();
  return {};
}

export async function deleteBanner(formData: FormData): Promise<Result> {
  const actor = await requireBannerEditor();

  const id = formData.get("id") as string;
  if (!id) return { error: "Missing banner." };

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("homepage_banners")
    .select("image_url")
    .eq("id", id)
    .maybeSingle();
  if (!data) return { error: "That banner no longer exists." };

  await supabase.from("homepage_banners").delete().eq("id", id);

  const marker = "/banner-media/";
  const idx = data.image_url.indexOf(marker);
  if (idx !== -1) {
    await supabase.storage.from("banner-media").remove([data.image_url.slice(idx + marker.length)]);
  }

  await logStaffActivity(actor, {
    action: "homepage_banner.delete",
    entityType: "homepage_banner",
    summary: "Removed a homepage banner",
  });
  revalidateBanners();
  return {};
}
