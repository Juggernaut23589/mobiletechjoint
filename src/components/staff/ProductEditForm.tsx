"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateProductDetails,
  updateProductStatus,
  assignProductCategory,
  assignProductBrand,
  setCompareAtPrice,
  toggleMerchandisingFlag,
} from "@/app/actions/admin-products";
import type { ProductWithImages, Category, Brand } from "@/types/database";

export function ProductEditForm({
  product,
  categories,
  brands,
}: {
  product: ProductWithImages;
  categories: Category[];
  brands: Brand[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleDetailsSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("productId", product.id);
    startTransition(async () => {
      const result = await updateProductDetails(formData);
      if (result.error) {
        setError(result.error);
      } else {
        setSaved(true);
        router.refresh();
        setTimeout(() => setSaved(false), 1500);
      }
    });
  }

  function quickAction(action: (formData: FormData) => Promise<{ error?: string }>, fields: Record<string, string>) {
    const formData = new FormData();
    formData.set("productId", product.id);
    for (const [key, value] of Object.entries(fields)) formData.set(key, value);
    startTransition(async () => {
      const result = await action(formData);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleDetailsSubmit} className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">
          Details
        </h2>

        <label className="mb-1 block text-xs text-neutral-500">Name</label>
        <input
          name="name"
          defaultValue={product.name}
          required
          className="mb-3 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />

        <label className="mb-1 block text-xs text-neutral-500">Description</label>
        <textarea
          name="description"
          defaultValue={product.description ?? ""}
          rows={5}
          className="mb-3 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />

        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-neutral-500">Price (₦)</label>
            <input
              name="priceNaira"
              type="number"
              min={1}
              defaultValue={product.price_kobo ? product.price_kobo / 100 : ""}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-500">Stock</label>
            <input
              name="stockQuantity"
              type="number"
              min={0}
              defaultValue={product.stock_quantity}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-brand-gradient px-4 py-2 text-sm font-semibold text-white shadow-glow disabled:opacity-50"
        >
          {saved ? "Saved ✓" : isPending ? "Saving…" : "Save details"}
        </button>
      </form>

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">
          Organization
        </h2>

        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-neutral-500">Status</label>
            <select
              defaultValue={product.status}
              disabled={isPending}
              onChange={(e) => quickAction(updateProductStatus, { status: e.target.value })}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-500">Category</label>
            <select
              defaultValue={product.category_id ?? ""}
              disabled={isPending}
              onChange={(e) => quickAction(assignProductCategory, { categoryId: e.target.value })}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label className="mb-1 block text-xs text-neutral-500">Brand</label>
        <select
          defaultValue={product.brand_id ?? ""}
          disabled={isPending}
          onChange={(e) => quickAction(assignProductBrand, { brandId: e.target.value })}
          className="mb-3 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        >
          <option value="">No brand</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>

        <label className="mb-1 block text-xs text-neutral-500">
          &quot;Was&quot; price for a discount badge (₦, optional)
        </label>
        <input
          type="number"
          min={1}
          defaultValue={product.compare_at_price_kobo ? product.compare_at_price_kobo / 100 : ""}
          disabled={isPending}
          onBlur={(e) => quickAction(setCompareAtPrice, { compareAtPriceNaira: e.target.value })}
          className="mb-3 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />

        <div className="flex gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              quickAction(toggleMerchandisingFlag, {
                field: "is_featured",
                nextValue: String(!product.is_featured),
              })
            }
            className={`rounded-full px-3 py-1 text-xs font-medium disabled:opacity-50 ${
              product.is_featured ? "bg-accent-500 text-brand-900" : "bg-neutral-100 text-neutral-500"
            }`}
          >
            {product.is_featured ? "★ In Hero" : "Add to Hero"}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              quickAction(toggleMerchandisingFlag, {
                field: "is_trending",
                nextValue: String(!product.is_trending),
              })
            }
            className={`rounded-full px-3 py-1 text-xs font-medium disabled:opacity-50 ${
              product.is_trending ? "bg-brand-600 text-white" : "bg-neutral-100 text-neutral-500"
            }`}
          >
            {product.is_trending ? "🔥 Trending" : "Mark Trending"}
          </button>
        </div>
      </div>
    </div>
  );
}
