"use client";

import { motion } from "framer-motion";
import { Plus, Check } from "lucide-react";
import { useState } from "react";
import { useCartStore } from "@/store/cart";

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
  const [added, setAdded] = useState(false);

  if (outOfStock) return null;

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    addItem({ productId, slug, name, priceKoboSnapshot: priceKobo, imageUrl, categoryId }, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  }

  return (
    <motion.button
      type="button"
      onClick={handleAdd}
      whileTap={{ scale: 0.9 }}
      aria-label={`Add ${name} to cart`}
      // top = image height (the image is a square as wide as the card, and
      // 100cqw is the card's inline size) minus the button + a margin, so the
      // button sits in the image's bottom-right corner without being nested
      // inside the card's <Link>.
      className="absolute right-2.5 top-[calc(100cqw-2.875rem)] flex h-9 w-9 items-center justify-center rounded-full bg-white text-brand-700 opacity-100 shadow-glow transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
    >
      {added ? <Check className="h-4 w-4" strokeWidth={2.5} /> : <Plus className="h-4 w-4" strokeWidth={2.5} />}
    </motion.button>
  );
}
