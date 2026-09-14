"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { useCartUIStore } from "@/store/cart-ui";

/** Opens the slide-out CartDrawer rather than navigating — matches the
 *  approved design-system mockup, which treats the cart icon as a drawer
 *  trigger, not a link to a full page. */
export function CartLink() {
  // Avoid SSR/client hydration mismatch: the persisted cart only exists in
  // the browser, so render 0 until mounted, then read the real count.
  const [mounted, setMounted] = useState(false);
  const count = useCartStore((s) => s.itemCount());
  const toggleCart = useCartUIStore((s) => s.toggleCart);

  useEffect(() => setMounted(true), []);

  return (
    // Padding + negative margin here only enlarges the tap target to a
    // comfortable mobile size — it doesn't affect layout flow. The badge
    // is positioned relative to the inner span (icon's own box), not this
    // padded button, so it still sits snug on the icon's corner either way.
    <button
      type="button"
      onClick={toggleCart}
      className="-m-2 flex items-center p-2 text-white"
      aria-label="Open cart"
    >
      <span className="relative flex items-center">
        <ShoppingCart className="h-5 w-5" strokeWidth={2} />
        <AnimatePresence>
          {mounted && count > 0 && (
            <motion.span
              key={count}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.4, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 20 }}
              className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-accent-500 text-[11px] font-bold text-white"
            >
              {count}
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    </button>
  );
}
