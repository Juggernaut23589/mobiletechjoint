"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCartStore } from "@/store/cart";

export function CartLink() {
  // Avoid SSR/client hydration mismatch: the persisted cart only exists in
  // the browser, so render 0 until mounted, then read the real count.
  const [mounted, setMounted] = useState(false);
  const count = useCartStore((s) => s.itemCount());

  useEffect(() => setMounted(true), []);

  return (
    <Link href="/cart" className="relative text-sm font-medium text-neutral-900">
      Cart
      {mounted && count > 0 && (
        <span className="absolute -right-3 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-neutral-900 text-xs text-white">
          {count}
        </span>
      )}
    </Link>
  );
}
