"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { X, Upload } from "lucide-react";
import { uploadBrandBannerImage, deleteBrandBannerImage } from "@/app/actions/staff-brand-assets";
import type { BrandBannerImage } from "@/types/database";

/** One instance per placement (top/bottom) on the brand-assets dashboard
 *  page — same upload/delete/router.refresh() pattern as
 *  ProductImageManager.tsx, just scoped to a brand + placement instead of
 *  a product. */
export function BrandAssetManager({
  brandId,
  brandSlug,
  placement,
  images,
}: {
  brandId: string;
  brandSlug: string;
  placement: "top" | "bottom";
  images: BrandBannerImage[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sorted = [...images].sort((a, b) => a.position - b.position);

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    const formData = new FormData();
    formData.set("brandId", brandId);
    formData.set("brandSlug", brandSlug);
    formData.set("placement", placement);
    formData.set("file", file);

    startTransition(async () => {
      const result = await uploadBrandBannerImage(formData);
      if (result.error) setError(result.error);
      else router.refresh();
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  }

  function handleDelete(id: string) {
    const formData = new FormData();
    formData.set("id", id);
    formData.set("brandSlug", brandSlug);
    startTransition(async () => {
      const result = await deleteBrandBannerImage(formData);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">
        {placement === "top" ? "Top banner" : "Bottom banner"} ({sorted.length})
      </h3>

      <div className="mb-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
        {sorted.map((img) => (
          <div key={img.id} className="group relative aspect-square overflow-hidden rounded-md bg-neutral-100">
            <Image src={img.image_url} alt="" fill sizes="120px" className="object-cover" />
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleDelete(img.id)}
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-50"
              aria-label="Remove"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-neutral-300 px-4 py-3 text-sm text-neutral-500 hover:border-brand-400 hover:text-brand-600">
        <Upload className="h-4 w-4" />
        {isPending ? "Uploading…" : "Upload image"}
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
