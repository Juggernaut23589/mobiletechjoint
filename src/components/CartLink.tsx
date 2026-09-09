"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart } from "lucide-react";
import { useCartStore } from "@/store/cart";

export function CartLink() {
  // Avoid SSR/client hydration mismatch: the persisted cart only exists in
  // the browser, so render 0 until mounted, then read the real count.
  const [mounted, setMounted] = useState(false);
  const count = useCartStore((s) => s.itemCount());

  useEffect(() => setMounted(true), []);

  return (
    <Link href="/cart" className="relative flex items-center text-white">
      <ShoppingCart className="h-5 w-5" strokeWidth={2} />
      <AnimatePresence>
        {mounted && count > 0 && (
          <motion.span
            key={count}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 20 }}
            className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-accent-500 text-[11px] font-bold text-brand-900"
          >
            {count}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );
}
