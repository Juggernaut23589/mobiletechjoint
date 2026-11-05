"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { X, Upload } from "lucide-react";
import { uploadProductImage, deleteProductImage } from "@/app/actions/admin-products";
import type { ProductImage } from "@/types/database";

const MAX_IMAGES = 4;

interface Picked {
  id: string;
  file: File;
  previewUrl: string;
  isVideo: boolean;
}

/** Picking files only stages local previews; nothing uploads until Publish
 *  is pressed — same reasoning as AdManager and BrandAssetManager. A
 *  product can hold at most MAX_IMAGES images/videos total, enforced here
 *  and again server-side in uploadProductImage. */
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
  const [picked, setPicked] = useState<Picked[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pickedRef = useRef<Picked[]>([]);
  useEffect(() => {
    pickedRef.current = picked;
  }, [picked]);

  useEffect(() => {
    return () => pickedRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl));
  }, []);

  const sorted = [...images].sort((a, b) => a.position - b.position);
  const slotsLeft = MAX_IMAGES - sorted.length - picked.length;

  function addFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    setError(null);
    const incoming = Array.from(list);
    const room = MAX_IMAGES - sorted.length - picked.length;
    if (incoming.length > room) {
      setError(
        room <= 0
          ? `This product already has ${MAX_IMAGES} images — remove one first.`
          : `Only ${room} more image${room === 1 ? "" : "s"} can be added (max ${MAX_IMAGES} per product).`
      );
    }
    const accepted = incoming.slice(0, Math.max(room, 0));
    const next: Picked[] = accepted.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 7)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      isVideo: file.type.startsWith("video/"),
    }));
    setPicked((prev) => [...prev, ...next]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removePicked(id: string) {
    setPicked((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  }

  function resetDraft() {
    picked.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setPicked([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handlePublish() {
    if (picked.length === 0) return;
    setError(null);

    const formData = new FormData();
    formData.set("productId", productId);
    for (const p of picked) formData.append("files", p.file);

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
        Media ({sorted.length}/{MAX_IMAGES})
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

        {picked.map((p) => (
          <div key={p.id} className="group relative aspect-square overflow-hidden rounded-md bg-neutral-100 ring-2 ring-brand-300">
            {p.isVideo ? (
              <video src={p.previewUrl} className="h-full w-full object-cover" muted />
            ) : (
              <Image src={p.previewUrl} alt="" fill sizes="120px" className="object-cover" />
            )}
            <button
              type="button"
              onClick={() => removePicked(p.id)}
              disabled={isPending}
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-50"
              aria-label="Remove picked file"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label
          className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed px-4 py-3 text-sm ${
            slotsLeft > 0
              ? "border-neutral-300 text-neutral-500 hover:border-brand-400 hover:text-brand-600"
              : "cursor-not-allowed border-neutral-200 text-neutral-300"
          }`}
        >
          <Upload className="h-4 w-4" />
          {slotsLeft > 0 ? `Choose up to ${slotsLeft} file${slotsLeft === 1 ? "" : "s"}` : "Max images reached"}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            disabled={isPending || slotsLeft <= 0}
            onChange={(e) => addFiles(e.target.files)}
            className="hidden"
          />
        </label>
        <button
          type="button"
          disabled={picked.length === 0 || isPending}
          onClick={handlePublish}
          className="rounded-md bg-brand-900 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPending ? "Publishing…" : `Publish${picked.length > 0 ? ` (${picked.length})` : ""}`}
        </button>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
