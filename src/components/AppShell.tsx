"use client";

import { useCartUIStore } from "@/store/cart-ui";

/** Wraps the header/content/footer stack that used to sit directly in
 *  layout.tsx. The only job here is the cart's "page compresses left"
 *  effect: on screens ≥lg, when the cart panel is open, this shifts right
 *  by the panel's width so nothing sits underneath it — CartDrawer itself
 *  has no backdrop at that width, so this is what actually keeps content
 *  from being covered. Below lg, CartDrawer reverts to a normal modal
 *  overlay and this intentionally does nothing (no room to compress
 *  into on a phone). */
export function AppShell({ children }: { children: React.ReactNode }) {
  const open = useCartUIStore((s) => s.open);

  return (
    <div className={`flex min-h-screen flex-col transition-[margin] duration-300 ease-out ${open ? "lg:mr-[400px]" : ""}`}>
      {children}
    </div>
  );
}
