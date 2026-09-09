"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useCartStore } from "@/store/cart";
import { formatNaira } from "@/lib/money";
import { CrossSellSection } from "@/components/CrossSellSection";

export default function CartPage() {
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
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="mb-2 text-xl font-semibold">Your cart is empty</h1>
        <Link href="/" className="text-sm font-medium underline">
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
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-brand-900">Your Cart</h1>

      <div className="flex flex-col divide-y divide-neutral-200 border-y border-neutral-200">
        {items.map((item) => (
          <div key={item.productId} className="flex flex-wrap items-center gap-4 py-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-neutral-100">
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

            <div className="ml-auto flex items-center gap-3 sm:ml-0">
              <input
                type="number"
                min={1}
                value={item.quantity}
                onChange={(e) =>
                  setQuantity(item.productId, Math.max(1, Number(e.target.value) || 1))
                }
                className="w-16 rounded-md border border-neutral-300 px-2 py-1 text-center text-sm"
              />

              <p className="w-24 text-right text-sm font-semibold">
                {formatNaira(item.priceKoboSnapshot * item.quantity)}
              </p>

              <button
                onClick={() => removeItem(item.productId)}
                className="text-sm text-neutral-400 hover:text-red-600"
                aria-label={`Remove ${item.name}`}
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <span className="text-sm text-neutral-500">
          Prices shown are estimates — the exact amount charged is verified
          against current product prices at checkout.
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-neutral-200 pt-4">
        <span className="text-lg font-semibold text-brand-900">Subtotal</span>
        <span className="text-lg font-semibold text-brand-900">{formatNaira(subtotalKobo)}</span>
      </div>

      <Link
        href="/checkout"
        className="mt-6 block w-full rounded-md bg-accent-500 px-6 py-3 text-center text-sm font-semibold text-brand-900 transition-colors hover:bg-accent-400"
      >
        Proceed to Checkout
      </Link>

      <div className="mt-10">
        <CrossSellSection categoryIds={categoryIds} excludeIds={excludeIds} />
      </div>
    </div>
  );
}
