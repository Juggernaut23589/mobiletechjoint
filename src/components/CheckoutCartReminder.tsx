"use client";

import { useEffect, useState } from "react";
import { useCartStore } from "@/store/cart";
import { formatNaira } from "@/lib/money";

/** Shown above the login form only when arriving from checkout — a reminder
 *  of what's actually in the cart, so logging in doesn't feel like a detour
 *  from buying something. Reads the client cart store, so it waits for
 *  mount to avoid a hydration mismatch. */
export function CheckoutCartReminder({ next }: { next: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const items = useCartStore((s) => s.items);
  const subtotalKobo = useCartStore((s) => s.subtotalKobo());

  if (!mounted || next !== "/checkout" || items.length === 0) return null;

  const count = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="mb-5 rounded-[14px] border border-neutral-200 bg-neutral-50 px-4 py-3 text-[13px] text-neutral-700">
      <span className="font-semibold text-brand-900">
        {count} item{count === 1 ? "" : "s"} waiting in your cart
      </span>{" "}
      — {formatNaira(subtotalKobo)}. Log in to continue, or{" "}
      <a href="/checkout" className="font-semibold text-brand-600 hover:underline">
        check out as a guest
      </a>
      .
    </div>
  );
}
