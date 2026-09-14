"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { X, Minus, Plus } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { useCartUIStore } from "@/store/cart-ui";
import { formatNaira } from "@/lib/money";

/** Slide-out cart drawer matching the approved design-system mockup
 *  (Main.dc.html). Portaled to document.body for the same reason
 *  MobileCategoryMenu is — SiteHeader has backdrop-blur, which creates a
 *  containing block that would break `position: fixed` positioning.
 *
 *  The drawer's own "Checkout" button links to /cart rather than
 *  /checkout directly: /cart is the existing full review step (quantities,
 *  cross-sells) before the required-account checkout gate, and skipping
 *  straight from a quick drawer glance to checkout would bypass that. */
export function CartDrawer() {
  const [mounted, setMounted] = useState(false);
  const open = useCartUIStore((s) => s.open);
  const closeCart = useCartUIStore((s) => s.closeCart);
  const items = useCartStore((s) => s.items);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const subtotalKobo = useCartStore((s) => s.subtotalKobo());

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  if (!mounted) return null;

  const drawer = (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={closeCart}
            className="fixed inset-0 z-40 bg-brand-900/55"
            aria-hidden="true"
          />
          <motion.div
            key="drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[400px] flex-col bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="Cart"
          >
            <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
              <h2 className="font-display text-lg font-bold text-brand-900">
                Your Cart ({items.reduce((s, i) => s + i.quantity, 0)})
              </h2>
              <button
                type="button"
                onClick={closeCart}
                aria-label="Close cart"
                className="-m-2 p-2 text-neutral-400 hover:text-neutral-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-3">
              {items.length === 0 ? (
                <p className="py-16 text-center text-sm text-neutral-500">
                  Your cart is empty.
                </p>
              ) : (
                items.map((item) => (
                  <div
                    key={item.productId}
                    className="flex gap-3 border-b border-neutral-100 py-4 last:border-0"
                  >
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                      {item.imageUrl ? (
                        <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-medium text-neutral-900">
                        {item.name}
                      </p>
                      <p className="mb-2 text-sm text-neutral-500">
                        {formatNaira(item.priceKoboSnapshot)}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center overflow-hidden rounded-full border border-neutral-200">
                          <button
                            type="button"
                            onClick={() => setQuantity(item.productId, item.quantity - 1)}
                            className="flex h-7 w-7 items-center justify-center text-neutral-700 hover:bg-neutral-50"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-7 text-center text-xs">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => setQuantity(item.productId, item.quantity + 1)}
                            className="flex h-7 w-7 items-center justify-center text-neutral-700 hover:bg-neutral-50"
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.productId)}
                          className="text-xs font-semibold text-red-500 hover:text-red-600"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-neutral-200 px-5 py-4">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm text-neutral-500">Subtotal</span>
                <span className="font-display text-lg font-bold text-brand-900">
                  {formatNaira(subtotalKobo)}
                </span>
              </div>
              <Link
                href="/cart"
                onClick={closeCart}
                className={`block w-full rounded-full py-3.5 text-center text-sm font-bold text-white ${
                  items.length === 0
                    ? "pointer-events-none bg-neutral-300"
                    : "bg-brand-900 hover:bg-brand-700"
                }`}
              >
                Review &amp; Checkout
              </Link>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(drawer, document.body);
}
