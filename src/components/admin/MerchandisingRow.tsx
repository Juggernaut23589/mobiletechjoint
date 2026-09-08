"use client";

import { useTransition } from "react";
import Image from "next/image";
import { formatNaira } from "@/lib/money";
import { toggleMerchandisingFlag } from "@/app/actions/admin-products";
import type { ProductWithImages } from "@/types/database";

/** One row per published product, with toggle buttons for the two
 *  merchandising flags — is_featured (homepage hero carousel) and
 *  is_trending (homepage "Trending Now" section). Both are manually
 *  curated by whoever runs this page; see the merchandising migration for
 *  why (no real order/sales data exists yet to compute this from). */
export function MerchandisingRow({ product }: { product: ProductWithImages }) {
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

  return (
    <div className="flex items-center gap-3 border-b border-neutral-200 py-3">
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-neutral-100">
        {cover ? (
          <Image src={cover.url} alt={product.name} fill sizes="48px" className="object-cover" />
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{product.name}</p>
        <p className="text-xs text-neutral-500">{formatNaira(product.price_kobo ?? 0)}</p>
      </div>

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
  );
}
