"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { X, Upload } from "lucide-react";
import { uploadAd, deleteAd } from "@/app/actions/staff-ads";
import type { AdPlacement } from "@/types/database";

/** One instance per ad group on the ad-placements dashboard page — a
 *  "homepage" group with no brand, or a "brand" group scoped to one
 *  brand. Same upload/delete/router.refresh() pattern as
 *  BrandAssetManager.tsx, plus a caption + optional link per ad since
 *  these are picture ads, not purely decorative banners. */
export function AdManager({
  placement,
  brandId,
  brandSlug,
  ads,
}: {
  placement: "homepage" | "brand";
  brandId?: string;
  brandSlug?: string;
  ads: AdPlacement[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sorted = [...ads].sort((a, b) => a.position - b.position);

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    const formData = new FormData();
    formData.set("placement", placement);
    if (brandId) formData.set("brandId", brandId);
    if (brandSlug) formData.set("brandSlug", brandSlug);
    formData.set("caption", caption.trim());
    formData.set("linkUrl", linkUrl.trim());
    formData.set("file", file);

    startTransition(async () => {
      const result = await uploadAd(formData);
      if (result.error) setError(result.error);
      else {
        router.refresh();
        setCaption("");
        setLinkUrl("");
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  }

  function handleDelete(id: string) {
    const formData = new FormData();
    formData.set("id", id);
    if (brandSlug) formData.set("brandSlug", brandSlug);
    startTransition(async () => {
      const result = await deleteAd(formData);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">
        {placement === "homepage" ? "Homepage ads" : "Brand ads"} ({sorted.length})
      </h3>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {sorted.map((ad) => (
          <div key={ad.id} className="group relative aspect-square overflow-hidden rounded-md bg-neutral-100">
            <Image src={ad.image_url} alt="" fill sizes="160px" className="object-cover" />
            {ad.caption && (
              <p className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-2 py-1 text-[11px] text-white">
                {ad.caption}
              </p>
            )}
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleDelete(ad.id)}
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-50"
              aria-label="Remove"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="mb-2 flex flex-wrap gap-2">
        <input
          type="text"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Caption (optional)"
          disabled={isPending}
          className="min-w-0 flex-1 basis-40 rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
        <input
          type="text"
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          placeholder="Link when clicked (optional)"
          disabled={isPending}
          className="min-w-0 flex-1 basis-40 rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>

      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-neutral-300 px-4 py-3 text-sm text-neutral-500 hover:border-brand-400 hover:text-brand-600">
        <Upload className="h-4 w-4" />
        {isPending ? "Uploading…" : "Upload ad image"}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          disabled={isPending}
          onChange={handleUpload}
          className="hidden"
        />
      </label>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
