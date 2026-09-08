"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cart";

export function AddToCartForm({
  productId,
  slug,
  name,
  priceKobo,
  imageUrl,
  stockQuantity,
  categoryId,
}: {
  productId: string;
  slug: string;
  name: string;
  priceKobo: number;
  imageUrl: string | null;
  stockQuantity: number;
  categoryId: string | null;
}) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const outOfStock = stockQuantity <= 0;

  function handleAdd() {
    addItem(
      { productId, slug, name, priceKoboSnapshot: priceKobo, imageUrl, categoryId },
      quantity
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  function handleBuyNow() {
    addItem(
      { productId, slug, name, priceKoboSnapshot: priceKobo, imageUrl, categoryId },
      quantity
    );
    router.push("/cart");
  }

  if (outOfStock) {
    return (
      <button
        disabled
        className="w-full cursor-not-allowed rounded-md bg-neutral-200 px-6 py-3 text-sm font-medium text-neutral-500"
      >
        Out of stock
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <label htmlFor="quantity" className="text-sm text-neutral-600">
          Quantity
        </label>
        <input
          id="quantity"
          type="number"
          min={1}
          max={stockQuantity}
          value={quantity}
          onChange={(e) =>
            setQuantity(Math.max(1, Math.min(stockQuantity, Number(e.target.value) || 1)))
          }
          className="w-16 rounded-md border border-neutral-300 px-2 py-1 text-sm"
        />
      </div>
      <div className="flex gap-3">
        <button
          onClick={handleAdd}
          className="flex-1 rounded-md border border-brand-700 px-6 py-3 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50"
        >
          {added ? "Added ✓" : "Add to Cart"}
        </button>
        <button
          onClick={handleBuyNow}
          className="flex-1 rounded-md bg-accent-500 px-6 py-3 text-sm font-semibold text-brand-900 transition-colors hover:bg-accent-400"
        >
          Buy Now
        </button>
      </div>
    </div>
  );
}
