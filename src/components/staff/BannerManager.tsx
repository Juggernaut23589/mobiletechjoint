"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { X, Upload } from "lucide-react";
import { uploadBanner, deleteBanner } from "@/app/actions/staff-banners";
import type { HomepageBanner } from "@/types/database";

const BANNER_LIMIT = 10;

/** "Customize Banner" screen — lets the admin add or remove full-bleed
 *  homepage hero banners (same box as the intro/brand slides already use,
 *  see HeroCarousel.tsx), up to BANNER_LIMIT. Same pick-a-file-then-stage-
 *  a-preview-then-explicit-Publish pattern as AdManager/BrandAssetManager:
 *  nothing uploads until Publish is pressed. The link is optional — a
 *  banner can be purely decorative or click through somewhere. */
export function BannerManager({ banners }: { banners: HomepageBanner[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sorted = [...banners].sort((a, b) => a.position - b.position);
  const atLimit = sorted.length >= BANNER_LIMIT;

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
    setLinkUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handlePublish() {
    if (!file) return;
    setError(null);

    const formData = new FormData();
    formData.set("linkUrl", linkUrl.trim());
    formData.set("file", file);

    startTransition(async () => {
      const result = await uploadBanner(formData);
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
    startTransition(async () => {
      const result = await deleteBanner(formData);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">
        Homepage banners ({sorted.length}/{BANNER_LIMIT})
      </h3>

      <div className="mb-4 flex flex-col gap-3">
        {sorted.map((banner) => (
          <div key={banner.id} className="group relative aspect-[1360/560] overflow-hidden rounded-md bg-neutral-100">
            <Image src={banner.image_url} alt="" fill sizes="600px" className="object-cover" />
            {banner.link_url && (
              <p className="absolute bottom-2 left-2 truncate rounded bg-black/55 px-2 py-1 text-[11px] text-white">
                Links to: {banner.link_url}
              </p>
            )}
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleDelete(banner.id)}
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-50"
              aria-label="Remove"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {atLimit ? (
        <p className="rounded-md border border-dashed border-neutral-300 px-4 py-3 text-sm text-neutral-500">
          Maximum of {BANNER_LIMIT} banners reached — remove one to add another.
        </p>
      ) : (
        <>
          {previewUrl && (
            <div className="relative mb-3 aspect-[1360/560] w-full max-w-sm overflow-hidden rounded-md bg-neutral-100">
              <Image src={previewUrl} alt="" fill sizes="384px" className="object-cover" />
              <button
                type="button"
                onClick={resetDraft}
                disabled={isPending}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white disabled:opacity-50"
                aria-label="Remove picked image"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="mb-2">
            <input
              type="text"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="Link when clicked (optional)"
              disabled={isPending}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-neutral-300 px-4 py-3 text-sm text-neutral-500 hover:border-brand-400 hover:text-brand-600">
              <Upload className="h-4 w-4" />
              {file ? "Change image" : "Choose banner image"}
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
              disabled={!file || isPending}
              onClick={handlePublish}
              className="rounded-md bg-brand-900 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isPending ? "Publishing…" : "Publish banner"}
            </button>
          </div>
          <p className="mt-1.5 text-xs text-neutral-400">
            Same size as the homepage hero — a wide image (1360×560 or similar) works best.
          </p>
        </>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
