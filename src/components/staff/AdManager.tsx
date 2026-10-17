"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { X, Upload } from "lucide-react";
import { uploadAd, deleteAd } from "@/app/actions/staff-ads";
import type { AdPlacement } from "@/types/database";

const BRAND_AD_LIMIT = 2;

/** One instance per ad group on the ad-placements dashboard page — a
 *  "homepage" group with no brand, or a "brand" group scoped to one
 *  brand (capped at BRAND_AD_LIMIT so two brand ads can render side by
 *  side on the product page, see products/[slug]/page.tsx).
 *
 *  Picking a file no longer uploads immediately — it only stages a local
 *  preview. The ad is only created once the admin has filled in a
 *  caption and a link AND pressed Publish, so nothing goes live
 *  half-filled-in. */
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
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sorted = [...ads].sort((a, b) => a.position - b.position);
  const atLimit = placement === "brand" && sorted.length >= BRAND_AD_LIMIT;

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (!picked) return;
    setError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(picked);
    setPreviewUrl(URL.createObjectURL(picked));
  }

  function resetDraft() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setCaption("");
    setLinkUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const canPublish = Boolean(file && caption.trim() && linkUrl.trim()) && !isPending;

  function handlePublish() {
    if (!file || !caption.trim() || !linkUrl.trim()) return;
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
        resetDraft();
      }
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
        {placement === "homepage" ? "Homepage ads" : "Brand ads"} ({sorted.length}
        {placement === "brand" ? `/${BRAND_AD_LIMIT}` : ""})
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

      {atLimit ? (
        <p className="rounded-md border border-dashed border-neutral-300 px-4 py-3 text-sm text-neutral-500">
          Maximum of {BRAND_AD_LIMIT} brand ads reached for this brand — remove one to add another.
        </p>
      ) : (
        <>
          {previewUrl && (
            <div className="relative mb-3 aspect-square w-32 overflow-hidden rounded-md bg-neutral-100">
              <Image src={previewUrl} alt="" fill sizes="128px" className="object-cover" />
              <button
                type="button"
                onClick={resetDraft}
                disabled={isPending}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white disabled:opacity-50"
                aria-label="Remove picked image"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div className="mb-2 flex flex-wrap gap-2">
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Caption (required)"
              disabled={isPending}
              className="min-w-0 flex-1 basis-40 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400"
            />
            <input
              type="text"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="Link when clicked (required)"
              disabled={isPending}
              className="min-w-0 flex-1 basis-40 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-neutral-300 px-4 py-3 text-sm text-neutral-500 hover:border-brand-400 hover:text-brand-600">
              <Upload className="h-4 w-4" />
              {file ? "Change image" : "Choose ad image"}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                disabled={isPending}
                onChange={handlePick}
                className="hidden"
              />
            </label>
            <button
              type="button"
              disabled={!canPublish}
              onClick={handlePublish}
              className="rounded-md bg-brand-900 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isPending ? "Publishing…" : "Publish ad"}
            </button>
          </div>
          <p className="mt-1.5 text-xs text-neutral-400">
            An image, caption, and link are all required before this ad can be published.
          </p>
        </>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
