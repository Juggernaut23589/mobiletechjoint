import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { fetchRecentMedia, cleanCaption, deriveProductName } from "@/lib/instagram";
import slugify from "slugify";

/**
 * Triggered once daily at 06:00 by Vercel Cron (see vercel.json — the
 * Hobby plan caps cron at one run/day; bump the schedule if this project
 * ever moves to Pro). Protected by
 * CRON_SECRET so it can't be invoked by anyone who finds the URL — Vercel
 * Cron sends this automatically as a Bearer token when CRON_SECRET is set
 * as a project env var.
 *
 * See src/lib/instagram.ts for the full design rationale. Summary: every
 * new Instagram media item becomes a status='draft' product with no price,
 * re-hosted images/video in Supabase Storage, and a row in
 * instagram_import_log (the dedup key). Nothing from this route can ever
 * reach the storefront until a human sets a price via /admin/products —
 * enforced by the DB, not just this code.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await fetchRecentMedia();
  if (!result.ok) {
    // Not configured yet, or a Graph API error — report clearly, don't 500.
    return NextResponse.json({ ok: false, error: result.error }, { status: 200 });
  }

  const supabase = createServiceClient();
  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const item of result.items) {
    const { data: existing } = await supabase
      .from("instagram_import_log")
      .select("id")
      .eq("instagram_media_id", item.id)
      .maybeSingle();

    if (existing) {
      skipped++;
      continue;
    }

    // Log the sighting immediately, before doing any work, so a crash
    // partway through this item doesn't cause it to be silently reprocessed
    // forever — the next poll sees this row and knows the media id exists,
    // even if it's still 'pending_review' because a later step failed.
    const { data: logRow, error: logError } = await supabase
      .from("instagram_import_log")
      .insert({
        instagram_media_id: item.id,
        raw_caption: item.caption,
        media_urls: item.media.map((m) => m.url),
        status: "pending_review",
      })
      .select("id")
      .single();

    if (logError || !logRow) {
      failed++;
      continue;
    }

    try {
      const name = deriveProductName(item.caption, item.id);
      const description = item.caption ? cleanCaption(item.caption) : null;
      const slug = `${slugify(name, { lower: true, strict: true })}-${item.id.slice(-8)}`;

      const { data: product, error: productError } = await supabase
        .from("products")
        .insert({
          name,
          slug,
          description,
          price_kobo: null,
          stock_quantity: 0,
          status: "draft",
          source: "instagram",
          instagram_media_id: item.id,
        })
        .select("id")
        .single();

      if (productError || !product) throw new Error(productError?.message ?? "product insert failed");

      for (const [position, media] of item.media.entries()) {
        const res = await fetch(media.url);
        if (!res.ok) throw new Error(`media download failed: HTTP ${res.status}`);
        const buffer = Buffer.from(await res.arrayBuffer());
        const contentType = res.headers.get("content-type") ?? (media.isVideo ? "video/mp4" : "image/jpeg");
        const ext = media.isVideo ? "mp4" : contentType.includes("png") ? "png" : "jpg";
        const storagePath = `products/${product.id}/${position}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("product-media")
          .upload(storagePath, buffer, { contentType, upsert: true });
        if (uploadError) throw new Error(uploadError.message);

        const { data: publicUrlData } = supabase.storage.from("product-media").getPublicUrl(storagePath);

        await supabase.from("product_images").insert({
          product_id: product.id,
          url: publicUrlData.publicUrl,
          is_video: media.isVideo,
          position,
        });
      }

      await supabase
        .from("instagram_import_log")
        .update({ status: "imported", product_id: product.id, processed_at: new Date().toISOString() })
        .eq("id", logRow.id);

      imported++;
    } catch (err) {
      await supabase
        .from("instagram_import_log")
        .update({ status: "failed", failure_reason: (err as Error).message })
        .eq("id", logRow.id);
      failed++;
    }
  }

  return NextResponse.json({ ok: true, imported, skipped, failed, total: result.items.length });
}
