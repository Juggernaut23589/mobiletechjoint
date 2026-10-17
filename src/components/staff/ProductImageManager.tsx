"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { X, Upload } from "lucide-react";
import { uploadProductImage, deleteProductImage } from "@/app/actions/admin-products";
import type { ProductImage } from "@/types/database";

/** Picking a file only stages a local preview; the image/video is only
 *  uploaded once Publish is pressed — same reasoning as AdManager and
 *  BrandAssetManager: nothing should land in the catalogue half-chosen. */
export function ProductImageManager({
  productId,
  images,
}: {
  productId: string;
  images: ProductImage[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sorted = [...images].sort((a, b) => a.position - b.position);
  const isVideo = file?.type.startsWith("video/") ?? false;

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
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handlePublish() {
    if (!file) return;
    setError(null);

    const formData = new FormData();
    formData.set("productId", productId);
    formData.set("file", file);
    formData.set("isVideo", String(file.type.startsWith("video/")));

    startTransition(async () => {
      const result = await uploadProductImage(formData);
      if (result.error) setError(result.error);
      else {
        router.refresh();
        resetDraft();
      }
    });
  }

  function handleDelete(imageId: string) {
    const formData = new FormData();
    formData.set("imageId", imageId);
    formData.set("productId", productId);
    startTransition(async () => {
      const result = await deleteProductImage(formData);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">
        Media ({sorted.length})
      </h2>

      <div className="mb-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
        {sorted.map((img) => (
          <div key={img.id} className="group relative aspect-square overflow-hidden rounded-md bg-neutral-100">
            {img.is_video ? (
              <video src={img.url} className="h-full w-full object-cover" muted />
            ) : (
              <Image src={img.url} alt="" fill sizes="120px" className="object-cover" />
            )}
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

      {previewUrl && (
        <div className="relative mb-3 aspect-square w-32 overflow-hidden rounded-md bg-neutral-100">
          {isVideo ? (
            <video src={previewUrl} className="h-full w-full object-cover" muted />
          ) : (
            <Image src={previewUrl} alt="" fill sizes="128px" className="object-cover" />
          )}
          <button
            type="button"
            onClick={resetDraft}
            disabled={isPending}
            className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white disabled:opacity-50"
            aria-label="Remove picked file"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-neutral-300 px-4 py-3 text-sm text-neutral-500 hover:border-brand-400 hover:text-brand-600">
          <Upload className="h-4 w-4" />
          {file ? "Change file" : "Choose image or video"}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
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
          {isPending ? "Publishing…" : "Publish"}
        </button>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
