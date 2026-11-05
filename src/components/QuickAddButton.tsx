"use client";

import { motion } from "framer-motion";
import { ShoppingCart, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { useCartStore } from "@/store/cart";
import { useCartUIStore } from "@/store/cart-ui";

/** Overlay button on a product card's image — adds one unit without
 *  leaving the grid. Always visible, not hover-only: it used to reveal
 *  on hover (desktop) or stay a plain "+", which (a) is invisible to
 *  anyone who hasn't moved a mouse over the card — most mobile and
 *  tablet traffic — and (b) a plain "+" doesn't read as "add to cart" at
 *  a glance. Solid accent-yellow + a white ring holds contrast against
 *  any product photo (light or dark background alike), not just the
 *  card's own near-black shell. */
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

  // Every card gets the icon, always visible (no hover/opacity gating) —
  // out of stock disables it (greyed out, no-op click) instead of
  // removing it, so the grid's layout stays consistent and it's obvious
  // at a glance why it can't be added.
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
      className={`absolute right-2.5 top-[calc(100cqw-2.625rem)] flex h-8 w-8 items-center justify-center rounded-full ring-2 shadow-lg ${
        outOfStock
          ? "cursor-not-allowed bg-white/70 text-neutral-400 ring-white/40"
          : "bg-accent-500 text-brand-900 ring-white/90 hover:bg-accent-400"
      }`}
    >
      {mounted && inCart && !outOfStock ? (
        <Check className="h-4 w-4" strokeWidth={2.75} />
      ) : (
        <ShoppingCart className="h-4 w-4" strokeWidth={2.25} />
      )}
    </motion.button>
  );
}
