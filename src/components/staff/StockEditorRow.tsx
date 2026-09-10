"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { updateStockQuantity } from "@/app/actions/staff-inventory";
import type { ProductWithImages } from "@/types/database";

export function StockEditorRow({ product }: { product: ProductWithImages }) {
  const [value, setValue] = useState(product.stock_quantity);
  const [isPending, startTransition] = useTransition();
  const cover = product.product_images.find((img) => !img.is_video) ?? null;
  const lowStock = product.stock_quantity > 0 && product.stock_quantity <= 5;

  function save() {
    const formData = new FormData();
    formData.set("productId", product.id);
    formData.set("stockQuantity", String(value));
    startTransition(() => {
      updateStockQuantity(formData);
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
        {product.stock_quantity <= 0 ? (
          <p className="text-xs font-medium text-red-600">Out of stock</p>
        ) : lowStock ? (
          <p className="text-xs font-medium text-amber-600">Low stock</p>
        ) : null}
      </div>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="w-20 rounded-md border border-neutral-300 px-2 py-1 text-sm"
      />
      <button
        type="button"
        disabled={isPending || value === product.stock_quantity}
        onClick={save}
        className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
      >
        {isPending ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
