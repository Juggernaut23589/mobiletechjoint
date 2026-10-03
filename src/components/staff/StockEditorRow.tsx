"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { updateReorderLevel, updateStockQuantity } from "@/app/actions/staff-inventory";
import { MANUAL_STOCK_REASONS, STOCK_REASON_LABELS } from "@/lib/stock-labels";
import type { ProductWithImages, StockReason } from "@/types/database";

export function StockEditorRow({ product }: { product: ProductWithImages }) {
  const [value, setValue] = useState(product.stock_quantity);
  const [reason, setReason] = useState<StockReason>("count");
  const [note, setNote] = useState("");
  const [reorderLevel, setReorderLevel] = useState(product.reorder_level);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const cover = product.product_images.find((img) => !img.is_video) ?? null;
  const changed = value !== product.stock_quantity;

  function run(action: (fd: FormData) => Promise<{ error?: string }>, fields: Record<string, string>) {
    const formData = new FormData();
    formData.set("productId", product.id);
    for (const [k, v] of Object.entries(fields)) formData.set(k, v);
    setError(null);
    startTransition(async () => {
      const res = await action(formData);
      if (res.error) setError(res.error);
    });
  }

  return (
    <div className="border-b border-neutral-200 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-neutral-100">
          {cover ? (
            <Image src={cover.url} alt={product.name} fill sizes="48px" className="object-contain" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1 basis-32">
          <Link
            href={`/staff/dashboard/products/${product.id}/edit#stock-history`}
            className="block truncate text-sm font-medium hover:text-brand-700 hover:underline"
          >
            {product.name}
          </Link>
          {product.stock_quantity <= 0 ? (
            <p className="text-xs font-medium text-red-600">Out of stock</p>
          ) : product.is_low_stock ? (
            <p className="text-xs font-medium text-amber-600">Low stock</p>
          ) : null}
        </div>
        <label className="flex items-center gap-1 text-xs text-neutral-500" title="Counts as low stock at or below this number">
          Low at
          <input
            type="number"
            min={0}
            value={reorderLevel}
            onChange={(e) => setReorderLevel(Number(e.target.value))}
            onBlur={() => {
              if (reorderLevel !== product.reorder_level) {
                run(updateReorderLevel, { reorderLevel: String(reorderLevel) });
              }
            }}
            className="w-14 rounded-md border border-neutral-300 px-2 py-1 text-sm"
          />
        </label>
        <label className="flex items-center gap-1 text-xs text-neutral-500">
          Stock
          <input
            type="number"
            min={0}
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            className="w-20 rounded-md border border-neutral-300 px-2 py-1 text-sm"
          />
        </label>
      </div>

      {changed && (
        <div className="mt-2 flex flex-wrap items-center gap-2 pl-15">
          <span className="text-xs text-neutral-500">
            {product.stock_quantity} → {value} ({value - product.stock_quantity > 0 ? "+" : ""}
            {value - product.stock_quantity})
          </span>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as StockReason)}
            className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs"
          >
            {MANUAL_STOCK_REASONS.map((r) => (
              <option key={r} value={r}>
                {STOCK_REASON_LABELS[r]}
              </option>
            ))}
          </select>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            className="min-w-0 flex-1 rounded-md border border-neutral-300 px-2 py-1 text-xs"
          />
          <button
            type="button"
            disabled={isPending}
            onClick={() => run(updateStockQuantity, { stockQuantity: String(value), reason, note })}
            className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
          >
            {isPending ? "Saving…" : "Save"}
          </button>
          <button type="button" onClick={() => setValue(product.stock_quantity)} className="text-xs text-neutral-500">
            Undo
          </button>
        </div>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
