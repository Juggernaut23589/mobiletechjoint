"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, Check } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { useCartUIStore } from "@/store/cart-ui";
import { Button } from "@/components/ui/Button";

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
  const openCart = useCartUIStore((s) => s.openCart);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const outOfStock = stockQuantity <= 0;

  function handleAdd() {
    addItem(
      { productId, slug, name, priceKoboSnapshot: priceKobo, imageUrl, categoryId },
      quantity
    );
    setAdded(true);
    // The header's cart badge is easy to miss, especially now that this
    // button sits well above the fold — opening the drawer confirms the
    // add with the actual item, image and running subtotal.
    openCart();
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
        className="w-full cursor-not-allowed rounded-full bg-neutral-200 px-6 py-3 text-sm font-medium text-neutral-500"
      >
        Out of stock
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="text-sm text-neutral-600">Quantity</span>
        <div className="flex items-center rounded-full border border-neutral-300">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="flex h-9 w-9 items-center justify-center text-neutral-500 hover:text-brand-700"
            aria-label="Decrease quantity"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="w-8 text-center text-sm font-medium">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(stockQuantity, q + 1))}
            className="flex h-9 w-9 items-center justify-center text-neutral-500 hover:text-brand-700"
            aria-label="Increase quantity"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="flex gap-3">
        <Button onClick={handleAdd} variant="accent" className="flex-1 rounded-full">
          {added ? (
            <>
              <Check className="h-4 w-4" /> Added
            </>
          ) : (
            "Add to Cart"
          )}
        </Button>
        <Button onClick={handleBuyNow} variant="dark" className="flex-1 rounded-full">
          Buy Now
        </Button>
      </div>
    </div>
  );
}
