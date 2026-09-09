"use client";

import { useTransition } from "react";
import Image from "next/image";
import { formatNaira } from "@/lib/money";
import { toggleMerchandisingFlag, assignProductBrand } from "@/app/actions/admin-products";
import type { ProductWithImages, Brand } from "@/types/database";

/** One row per published product: toggle buttons for the two merchandising
 *  flags (is_featured -> hero carousel, is_trending -> "Trending Now"), plus
 *  a brand select. All manually curated — see the merchandising migration
 *  for why (no real order/sales data yet) and scripts/backfill-brands.ts
 *  for why brand needs a manual correction path (title keyword-matching is
 *  imperfect). */
export function MerchandisingRow({
  product,
  brands,
}: {
  product: ProductWithImages;
  brands: Brand[];
}) {
  const [isPending, startTransition] = useTransition();

  const cover = product.product_images.find((img) => !img.is_video) ?? null;

  function toggle(field: "is_featured" | "is_trending", current: boolean) {
    const formData = new FormData();
    formData.set("productId", product.id);
    formData.set("field", field);
    formData.set("nextValue", String(!current));
    startTransition(() => {
      toggleMerchandisingFlag(formData);
    });
  }

  function handleBrandChange(brandId: string) {
    const formData = new FormData();
    formData.set("productId", product.id);
    formData.set("brandId", brandId);
    startTransition(() => {
      assignProductBrand(formData);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-neutral-200 py-3">
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-neutral-100">
        {cover ? (
          <Image src={cover.url} alt={product.name} fill sizes="48px" className="object-cover" />
        ) : null}
      </div>

      <div className="min-w-0 flex-1 basis-32">
        <p className="truncate text-sm font-medium">{product.name}</p>
        <p className="text-xs text-neutral-500">{formatNaira(product.price_kobo ?? 0)}</p>
      </div>

      <select
        defaultValue={product.brand_id ?? ""}
        disabled={isPending}
        onChange={(e) => handleBrandChange(e.target.value)}
        className="w-full shrink-0 rounded-md border border-neutral-300 px-2 py-1 text-xs disabled:opacity-50 sm:w-32"
      >
        <option value="">No brand</option>
        {brands.map((brand) => (
          <option key={brand.id} value={brand.id}>
            {brand.name}
          </option>
        ))}
      </select>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => toggle("is_featured", product.is_featured)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
            product.is_featured
              ? "bg-accent-500 text-brand-900"
              : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
          }`}
        >
          {product.is_featured ? "★ Hero" : "Add to Hero"}
        </button>

        <button
          type="button"
          disabled={isPending}
          onClick={() => toggle("is_trending", product.is_trending)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
            product.is_trending
              ? "bg-brand-600 text-white"
              : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
          }`}
        >
          {product.is_trending ? "🔥 Trending" : "Mark Trending"}
        </button>
      </div>
    </div>
  );
}
