"use client";

import { useEffect, useState } from "react";
import { ProductSection } from "@/components/ProductSection";
import type { ProductWithImages } from "@/types/database";

/** Client-side counterpart to lib/products.ts's getRelatedProducts — used
 *  on the cart page (a Client Component, so it can't call the server-only
 *  data functions directly). Fetches real cross-sells for whatever
 *  categories are actually in the cart via /api/products/cross-sells. */
export function CrossSellSection({
  categoryIds,
  excludeIds,
}: {
  categoryIds: string[];
  excludeIds: string[];
}) {
  const [products, setProducts] = useState<ProductWithImages[]>([]);

  useEffect(() => {
    if (categoryIds.length === 0) {
      setProducts([]);
      return;
    }
    const controller = new AbortController();
    const params = new URLSearchParams({
      categories: categoryIds.join(","),
      exclude: excludeIds.join(","),
      limit: "4",
    });
    fetch(`/api/products/cross-sells?${params}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => setProducts(data.products ?? []))
      .catch(() => {});
    return () => controller.abort();
  }, [categoryIds.join(","), excludeIds.join(",")]);

  if (products.length === 0) return null;

  return <ProductSection title="You might also like" products={products} />;
}
