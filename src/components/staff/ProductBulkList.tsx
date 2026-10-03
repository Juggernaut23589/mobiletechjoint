"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { bulkUpdateProducts } from "@/app/actions/admin-products";
import { formatNaira } from "@/lib/money";

export interface BulkListItem {
  id: string;
  name: string;
  coverUrl: string | null;
  priceKobo: number | null;
  brandName: string | null;
  stock: number;
  status: string;
}

const STATUS_STYLES: Record<string, string> = {
  published: "bg-green-100 text-green-700",
  draft: "bg-amber-100 text-amber-700",
  archived: "bg-neutral-200 text-neutral-600",
};

type Field = "status" | "category_id" | "brand_id";

export function ProductBulkList({
  items,
  categories,
  brands,
  emptyText,
}: {
  items: BulkListItem[];
  categories: { id: string; name: string }[];
  brands: { id: string; name: string }[];
  emptyText: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [field, setField] = useState<Field>("status");
  const [value, setValue] = useState("published");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const allSelected = items.length > 0 && items.every((i) => selected.has(i.id));
  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const options =
    field === "status"
      ? [
          { id: "published", name: "Published" },
          { id: "draft", name: "Draft" },
          { id: "archived", name: "Archived" },
        ]
      : field === "category_id"
        ? categories
        : [{ id: "", name: "No brand" }, ...brands];

  function apply() {
    const ids = [...selected];
    setMessage(null);
    startTransition(async () => {
      const res = await bulkUpdateProducts(ids, field, value || null);
      if (res.error) {
        setMessage(res.error);
        return;
      }
      setMessage(
        `Updated ${res.updated} product${res.updated === 1 ? "" : "s"}.` +
          (res.failed?.length ? ` Couldn't update: ${res.failed.slice(0, 5).join(", ")}${res.failed.length > 5 ? "…" : ""} (publishing needs a price).` : "")
      );
      setSelected(new Set());
    });
  }

  return (
    <div>
      {selected.size > 0 && (
        <div className="sticky top-2 z-10 mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm">
          <span className="font-semibold text-brand-900">{selected.size} selected</span>
          <select
            value={field}
            onChange={(e) => {
              const f = e.target.value as Field;
              setField(f);
              setValue(f === "status" ? "published" : f === "category_id" ? (categories[0]?.id ?? "") : "");
            }}
            className="rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm"
          >
            <option value="status">Set status</option>
            <option value="category_id">Set category</option>
            <option value="brand_id">Set brand</option>
          </select>
          <select value={value} onChange={(e) => setValue(e.target.value)} className="max-w-56 rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm">
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={isPending}
            onClick={apply}
            className="rounded-full bg-brand-900 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {isPending ? "Applying…" : "Apply"}
          </button>
          <button type="button" onClick={() => setSelected(new Set())} className="text-xs text-neutral-500">
            Clear selection
          </button>
        </div>
      )}
      {message && <p className="mb-3 rounded-md bg-neutral-100 px-3 py-2 text-sm text-neutral-700">{message}</p>}

      <div className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
        {items.length === 0 ? (
          <p className="p-6 text-sm text-neutral-500">{emptyText}</p>
        ) : (
          <label className="flex items-center gap-3 px-3 py-2 text-xs text-neutral-500">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => setSelected(allSelected ? new Set() : new Set(items.map((i) => i.id)))}
            />
            Select all on this page
          </label>
        )}
        {items.map((product) => (
          <div key={product.id} className="flex items-center gap-3 p-3 hover:bg-neutral-50">
            <input
              type="checkbox"
              checked={selected.has(product.id)}
              onChange={() => toggle(product.id)}
              aria-label={`Select ${product.name}`}
            />
            <Link href={`/staff/dashboard/products/${product.id}/edit`} className="flex min-w-0 flex-1 items-center gap-3">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-neutral-100">
                {product.coverUrl ? (
                  <Image src={product.coverUrl} alt={product.name} fill sizes="48px" className="object-contain" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{product.name}</p>
                <p className="text-xs text-neutral-500">
                  {product.priceKobo ? formatNaira(product.priceKobo) : "No price set"} · {product.brandName ?? "No brand"} · Stock{" "}
                  {product.stock}
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[product.status]}`}>
                {product.status}
              </span>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
