"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Cart deliberately stores ONLY product_id + quantity + a display snapshot —
 * never a trusted price. At checkout, the server re-fetches each product's
 * current price_kobo directly from the database (see the checkout Server
 * Action). A price shown here is for display only; if it were trusted at
 * checkout, a user could edit localStorage to pay whatever they choose.
 */
export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  /** Display-only snapshot of the price at add-to-cart time. NOT used at checkout. */
  priceKoboSnapshot: number;
  imageUrl: string | null;
  quantity: number;
  /** Used only to fetch cross-sell suggestions on the cart page — not trusted for anything else. */
  categoryId: string | null;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clear: () => void;
  itemCount: () => number;
  subtotalKobo: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item, quantity = 1) =>
        set((state) => {
          const existing = state.items.find((i) => i.productId === item.productId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId
                  ? { ...i, quantity: i.quantity + quantity }
                  : i
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity }] };
        }),

      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        })),

      setQuantity: (productId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.productId !== productId)
              : state.items.map((i) =>
                  i.productId === productId ? { ...i, quantity } : i
                ),
        })),

      clear: () => set({ items: [] }),

      itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

      subtotalKobo: () =>
        get().items.reduce((sum, i) => sum + i.priceKoboSnapshot * i.quantity, 0),
    }),
    { name: "mtj-cart" }
  )
);
