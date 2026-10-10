"use client";

import { create } from "zustand";
import { toggleWishlist as toggleWishlistAction } from "@/app/actions/wishlist";

/** Client-side mirror of the logged-in customer's wishlist product ids —
 *  fetched once (so every ProductCard's heart button knows its filled/
 *  unfilled state without an N+1 query per card), then updated optimistic-
 *  ally as the customer toggles items. Not persisted to localStorage like
 *  the cart: this is a real server-side record, this store is just a
 *  cache of it for the current page load. */
interface WishlistState {
  productIds: Set<string>;
  loaded: boolean;
  loading: boolean;
  ensureLoaded: () => Promise<void>;
  has: (productId: string) => boolean;
  toggle: (productId: string) => Promise<{ error?: string }>;
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  productIds: new Set(),
  loaded: false,
  loading: false,

  async ensureLoaded() {
    if (get().loaded || get().loading) return;
    set({ loading: true });
    try {
      const res = await fetch("/api/wishlist");
      const data = await res.json();
      set({ productIds: new Set(data.productIds ?? []), loaded: true, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  has(productId) {
    return get().productIds.has(productId);
  },

  async toggle(productId) {
    const was = get().productIds.has(productId);
    const next = new Set(get().productIds);
    if (was) next.delete(productId);
    else next.add(productId);
    set({ productIds: next });

    const result = await toggleWishlistAction(productId);
    if ("error" in result) {
      // Roll back on failure (e.g. not logged in).
      const reverted = new Set(get().productIds);
      if (was) reverted.add(productId);
      else reverted.delete(productId);
      set({ productIds: reverted });
      return { error: result.error };
    }
    return {};
  },
}));
