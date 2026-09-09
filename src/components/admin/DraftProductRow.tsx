"use client";

import { useActionState } from "react";
import Image from "next/image";
import { publishDraftProduct, archiveProduct } from "@/app/actions/admin-products";
import type { ProductWithImages } from "@/types/database";

export function DraftProductRow({ product }: { product: ProductWithImages }) {
  const [publishState, publishAction, publishing] = useActionState(
    async (_prev: { error?: string }, formData: FormData) => (await publishDraftProduct(formData)) ?? {},
    {}
  );
  const [, archiveAction, archiving] = useActionState(
    async (_prev: { error?: string }, formData: FormData) => (await archiveProduct(formData)) ?? {},
    {}
  );

  const cover = product.product_images.find((img) => !img.is_video) ?? null;

  return (
    <div className="flex gap-4 border-b border-neutral-200 py-4">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-neutral-100">
        {cover ? (
          <Image src={cover.url} alt={product.name} fill sizes="80px" className="object-cover" />
        ) : null}
      </div>

      <div className="flex-1">
        <h3 className="text-sm font-medium">{product.name}</h3>
        <p className="mb-2 text-xs text-neutral-500">
          {product.source === "instagram" ? "From Instagram" : "From WooCommerce import"}
          {product.category ? ` · ${product.category.name}` : ""}
        </p>

        <form action={publishAction} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="productId" value={product.id} />
          <div>
            <label className="block text-xs text-neutral-500">Price (₦)</label>
            <input
              name="priceNaira"
              type="number"
              min={1}
              step="1"
              required
              defaultValue={product.price_kobo ? product.price_kobo / 100 : ""}
              className="w-28 rounded-md border border-neutral-300 px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-neutral-500">Stock</label>
            <input
              name="stockQuantity"
              type="number"
              min={0}
              step="1"
              required
              defaultValue={product.stock_quantity || ""}
              className="w-20 rounded-md border border-neutral-300 px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-neutral-500">
              &quot;Was&quot; price (₦, optional)
            </label>
            <input
              name="compareAtPriceNaira"
              type="number"
              min={1}
              step="1"
              placeholder="For a discount badge"
              className="w-36 rounded-md border border-neutral-300 px-2 py-1 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={publishing}
            className="rounded-md bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {publishing ? "Publishing…" : "Publish"}
          </button>
        </form>

        <form action={archiveAction} className="mt-1">
          <input type="hidden" name="productId" value={product.id} />
          <button
            type="submit"
            disabled={archiving}
            className="text-xs text-neutral-400 hover:text-red-600 disabled:opacity-50"
          >
            {archiving ? "Archiving…" : "Archive instead"}
          </button>
        </form>

        {publishState.error && (
          <p className="mt-1 text-xs text-red-600">{publishState.error}</p>
        )}
      </div>
    </div>
  );
}
