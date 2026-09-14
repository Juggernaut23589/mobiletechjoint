"use client";

import { create } from "zustand";

/** Cart drawer open/closed state, kept separate from the persisted cart
 *  store (store/cart.ts) — this must NOT survive a reload, or the drawer
 *  would pop back open on every page load. */
interface CartUIState {
  open: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
}

export const useCartUIStore = create<CartUIState>((set) => ({
  open: false,
  openCart: () => set({ open: true }),
  closeCart: () => set({ open: false }),
  toggleCart: () => set((s) => ({ open: !s.open })),
}));
