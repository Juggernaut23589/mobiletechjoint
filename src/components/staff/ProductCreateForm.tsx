"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Upload, X, GripVertical } from "lucide-react";
import { createProduct } from "@/app/actions/admin-products";
import type { Category, Brand } from "@/types/database";

interface Picked {
  id: string;
  file: File;
  previewUrl: string;
  isVideo: boolean;
}

/** New-product form for staff with the manage_products ability. One
 *  submit creates the product and uploads every chosen file (first file
 *  becomes the cover; the arrows reorder). On success it lands on the
 *  edit page, which already has the full media manager and merchandising
 *  toggles, so nothing here duplicates that. */
export function ProductCreateForm({
  categories,
  brands,
}: {
  categories: Category[];
  brands: Brand[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [picked, setPicked] = useState<Picked[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Mirror of `picked` for the unmount cleanup below, which must see the
  // latest list without re-running (and revoking live previews) on every
  // change.
  const pickedRef = useRef<Picked[]>([]);
  useEffect(() => {
    pickedRef.current = picked;
  }, [picked]);

  useEffect(() => {
    return () => pickedRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl));
  }, []);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next: Picked[] = Array.from(list).map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 7)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      isVideo: file.type.startsWith("video/"),
    }));
    setPicked((prev) => [...prev, ...next]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeFile(id: string) {
    setPicked((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  }

  function move(id: string, dir: -1 | 1) {
    setPicked((prev) => {
      const i = prev.findIndex((p) => p.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const copy = [...prev];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.delete("files");
    picked.forEach((p) => formData.append("files", p.file));
    formData.set("status", status);

    startTransition(async () => {
      const result = await createProduct(formData);
      if (result.error && !result.productId) {
        setError(result.error);
        return;
      }
      if (result.error) {
        // Created, but some media failed — go to the edit page where the
        // media manager can retry, and show what went wrong there.
        router.push(
          `/staff/dashboard/products/${result.productId}/edit?notice=${encodeURIComponent(result.error)}`
        );
        return;
      }
      router.push(`/staff/dashboard/products/${result.productId}/edit?created=1`);
    });
  }

  const input = "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm";
  const label = "mb-1 block text-xs text-neutral-500";

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-6">
        <section className="rounded-lg border border-neutral-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">
            Details
          </h2>

          <label className={label} htmlFor="name">
            Name
          </label>
          <input id="name" name="name" required className={`${input} mb-3`} placeholder="e.g. Godox AD300Pro Outdoor Flash" />

          <label className={label} htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={6}
            className={`${input} mb-3`}
            placeholder="What it is, what's in the box, who it's for."
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label} htmlFor="priceNaira">
                Price (₦){status === "published" ? " — required" : ""}
              </label>
              <input
                id="priceNaira"
                name="priceNaira"
                type="number"
                min={1}
                step={1}
                required={status === "published"}
                className={input}
              />
            </div>
            <div>
              <label className={label} htmlFor="stockQuantity">
                Stock
              </label>
              <input
                id="stockQuantity"
                name="stockQuantity"
                type="number"
                min={0}
                step={1}
                defaultValue={0}
                className={input}
              />
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-neutral-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">
            Organization
          </h2>

          <div className="mb-3 grid grid-cols-2 gap-3">
            <div>
              <label className={label} htmlFor="categoryId">
                Category
              </label>
              <select id="categoryId" name="categoryId" className={input} defaultValue="">
                <option value="">Uncategorized</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label} htmlFor="brandId">
                Brand
              </label>
              <select id="brandId" name="brandId" className={input} defaultValue="">
                <option value="">No brand</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label className={label} htmlFor="compareAtPriceNaira">
            &quot;Was&quot; price for a discount badge (₦, optional)
          </label>
          <input
            id="compareAtPriceNaira"
            name="compareAtPriceNaira"
            type="number"
            min={1}
            step={1}
            className={`${input} mb-4`}
          />

          <span className={label}>Visibility</span>
          <div className="flex gap-2">
            {(["draft", "published"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold capitalize transition-colors ${
                  status === s
                    ? s === "published"
                      ? "bg-green text-white"
                      : "bg-amber-500 text-white"
                    : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                }`}
              >
                {s === "draft" ? "Save as draft" : "Publish now"}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-neutral-500">
            {status === "published"
              ? "Goes live on the storefront immediately after saving."
              : "Hidden from shoppers until you publish it from the edit page."}
          </p>
        </section>
      </div>

      <div className="flex flex-col gap-6">
        <section className="rounded-lg border border-neutral-200 bg-white p-4">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-neutral-500">
            Media ({picked.length})
          </h2>
          <p className="mb-3 text-xs text-neutral-500">
            The first item is the cover photo. Images or short videos, up to 25MB each.
          </p>

          {picked.length > 0 && (
            <ul className="mb-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
              {picked.map((p, i) => (
                <li
                  key={p.id}
                  className="group relative aspect-square overflow-hidden rounded-md bg-neutral-100"
                >
                  {p.isVideo ? (
                    <video src={p.previewUrl} className="h-full w-full object-cover" muted />
                  ) : (
                    <Image
                      src={p.previewUrl}
                      alt=""
                      fill
                      unoptimized
                      sizes="120px"
                      className="object-cover"
                    />
                  )}
                  {i === 0 && (
                    <span className="absolute left-1 top-1 rounded-full bg-brand-900/80 px-2 py-0.5 text-[10px] font-semibold text-white">
                      Cover
                    </span>
                  )}
                  <div className="absolute inset-x-1 bottom-1 flex items-center justify-between gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <span className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => move(p.id, -1)}
                        disabled={i === 0}
                        aria-label="Move earlier"
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white disabled:opacity-30"
                      >
                        <GripVertical className="h-3.5 w-3.5 -rotate-90" />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(p.id, 1)}
                        disabled={i === picked.length - 1}
                        aria-label="Move later"
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white disabled:opacity-30"
                      >
                        <GripVertical className="h-3.5 w-3.5 rotate-90" />
                      </button>
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFile(p.id)}
                      aria-label="Remove"
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-neutral-300 px-4 py-6 text-sm text-neutral-500 hover:border-brand-400 hover:text-brand-600">
            <Upload className="h-4 w-4" />
            {picked.length === 0 ? "Choose images or videos" : "Add more"}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              disabled={isPending}
              onChange={(e) => addFiles(e.target.files)}
              className="hidden"
            />
          </label>
        </section>

        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-full bg-brand-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-glow disabled:opacity-50"
            >
              {isPending
                ? picked.length > 0
                  ? `Uploading ${picked.length} file${picked.length === 1 ? "" : "s"}…`
                  : "Saving…"
                : status === "published"
                  ? "Create & publish"
                  : "Create draft"}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => router.push("/staff/dashboard/products")}
              className="text-sm font-medium text-neutral-500 hover:text-neutral-900"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
