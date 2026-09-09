"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Minus, Plus, X, ShoppingBag } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { formatNaira } from "@/lib/money";
import { CrossSellSection } from "@/components/CrossSellSection";
import { Button } from "@/components/ui/Button";

export default function CartPage() {
  const router = useRouter();
  // Cart state is persisted to localStorage, so it only exists client-side —
  // render nothing meaningful until mounted to avoid a hydration mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const items = useCartStore((s) => s.items);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const subtotalKobo = useCartStore((s) => s.subtotalKobo());

  if (!mounted) return null;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <ShoppingBag className="mx-auto mb-4 h-10 w-10 text-neutral-300" />
        <h1 className="mb-2 text-xl font-semibold text-brand-900">Your cart is empty</h1>
        <Link href="/" className="text-sm font-medium text-brand-600 hover:underline">
          Continue shopping
        </Link>
      </div>
    );
  }

  const categoryIds = Array.from(
    new Set(items.map((i) => i.categoryId).filter((id): id is string => Boolean(id)))
  );
  const excludeIds = items.map((i) => i.productId);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display mb-6 text-2xl font-bold tracking-tight text-brand-900">
        Your Cart
      </h1>

      <div className="flex flex-col gap-3">
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <motion.div
              key={item.productId}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -24, transition: { duration: 0.2 } }}
              className="flex flex-wrap items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-4"
            >
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                ) : null}
              </div>

              <div className="flex min-w-0 flex-1 basis-40 flex-col gap-1">
                <Link
                  href={`/products/${item.slug}`}
                  className="truncate text-sm font-medium hover:underline"
                >
                  {item.name}
                </Link>
                <p className="text-sm text-neutral-500">
                  {formatNaira(item.priceKoboSnapshot)} each
                </p>
              </div>

              <div className="ml-auto flex items-center gap-4 sm:ml-0">
                <div className="flex items-center rounded-full border border-neutral-300">
                  <button
                    onClick={() => setQuantity(item.productId, Math.max(1, item.quantity - 1))}
                    className="flex h-8 w-8 items-center justify-center text-neutral-500 hover:text-brand-700"
                    aria-label={`Decrease quantity of ${item.name}`}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                  <button
                    onClick={() => setQuantity(item.productId, item.quantity + 1)}
                    className="flex h-8 w-8 items-center justify-center text-neutral-500 hover:text-brand-700"
                    aria-label={`Increase quantity of ${item.name}`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                <p className="w-24 text-right text-sm font-semibold text-brand-900">
                  {formatNaira(item.priceKoboSnapshot * item.quantity)}
                </p>

                <button
                  onClick={() => removeItem(item.productId)}
                  className="text-neutral-400 hover:text-red-600"
                  aria-label={`Remove ${item.name}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <p className="mt-4 text-xs text-neutral-400">
        Prices shown are estimates — the exact amount charged is verified against current
        product prices at checkout.
      </p>

      <div className="mt-4 flex items-center justify-between rounded-2xl bg-brand-50 px-4 py-3">
        <span className="text-lg font-semibold text-brand-900">Subtotal</span>
        <span className="font-display text-lg font-bold text-brand-900">
          {formatNaira(subtotalKobo)}
        </span>
      </div>

      <Button
        variant="primary"
        className="mt-6 w-full"
        onClick={() => router.push("/checkout")}
      >
        Proceed to Checkout
      </Button>

      <div className="mt-10">
        <CrossSellSection categoryIds={categoryIds} excludeIds={excludeIds} />
      </div>
    </div>
  );
}
