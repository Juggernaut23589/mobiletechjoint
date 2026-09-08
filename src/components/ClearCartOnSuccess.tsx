"use client";

import { useEffect } from "react";
import { useCartStore } from "@/store/cart";

/** Fires once on mount to empty the cart after a confirmed successful payment. */
export function ClearCartOnSuccess() {
  const clear = useCartStore((s) => s.clear);
  useEffect(() => {
    clear();
  }, [clear]);
  return null;
}
