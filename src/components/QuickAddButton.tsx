"use client";

import { motion } from "framer-motion";
import { Plus, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { useCartStore } from "@/store/cart";
import { useCartUIStore } from "@/store/cart-ui";

/** Overlay button on a product card's image — adds one unit without
 *  leaving the grid. Stays out of the way (opacity-0, revealed on card
 *  hover) so it doesn't compete with the "go look at this product" click
 *  target that covers the rest of the card. */
export function QuickAddButton({
  productId,
  slug,
  name,
  priceKobo,
  imageUrl,
  categoryId,
  outOfStock,
}: {
  productId: string;
  slug: string;
  name: string;
  priceKobo: number;
  imageUrl: string | null;
  categoryId: string | null;
  outOfStock: boolean;
}) {
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartUIStore((s) => s.openCart);
  // Reflects actual cart membership (persisted, so it survives navigation)
  // rather than a timed flag that reverted to the plus icon on its own —
  // the checkmark now stays until the item is actually removed from cart.
  const inCart = useCartStore((s) => s.items.some((i) => i.productId === productId));
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) return;
    addItem({ productId, slug, name, priceKoboSnapshot: priceKobo, imageUrl, categoryId }, 1);
    // A card-overlay click is otherwise confirmed only by a small header
    // badge changing — easy to miss while scanning a grid.
    openCart();
  }

  // Every card gets the icon — out of stock disables it (greyed out,
  // no-op click) instead of removing it, so the grid's layout stays
  // consistent and it's obvious at a glance why it can't be added.
  return (
    <motion.button
      type="button"
      onClick={handleAdd}
      disabled={outOfStock}
      whileTap={outOfStock ? undefined : { scale: 0.9 }}
      aria-label={outOfStock ? `${name} is out of stock` : `Add ${name} to cart`}
      // top = image height (the image is a square as wide as the card, and
      // 100cqw is the card's inline size) minus the button + a margin, so the
      // button sits in the image's bottom-right corner without being nested
      // inside the card's <Link>.
      className={`absolute right-2.5 top-[calc(100cqw-2.375rem)] flex h-7 w-7 items-center justify-center rounded-full shadow-glow transition-opacity ${
        outOfStock
          ? "cursor-not-allowed bg-white/70 text-neutral-400 opacity-100"
          : "bg-white text-brand-700 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
      }`}
    >
      {mounted && inCart && !outOfStock ? (
        <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
      ) : (
        <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
      )}
    </motion.button>
  );
}
