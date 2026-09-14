"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import type { ProductWithImages } from "@/types/database";

/** Horizontal scrolling product row with arrow-scroll buttons, matching
 *  the approved design-system mockup's "New Arrivals" section. */
export function ProductCarousel({
  title,
  products,
}: {
  title: string;
  products: ProductWithImages[];
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  if (products.length === 0) return null;

  function scroll(dir: 1 | -1) {
    trackRef.current?.scrollBy({ left: dir * 260, behavior: "smooth" });
  }

  return (
    <section className="mx-auto max-w-[1360px] px-4 pt-14 sm:px-8">
      <div className="mb-5 flex items-baseline justify-between">
        <h2 className="font-display text-2xl text-brand-900">{title}</h2>
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={() => scroll(-1)}
            aria-label="Scroll left"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white transition-colors hover:border-brand-900 hover:bg-brand-900 [&:hover_svg]:stroke-white"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => scroll(1)}
            aria-label="Scroll right"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white transition-colors hover:border-brand-900 hover:bg-brand-900 [&:hover_svg]:stroke-white"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </div>
      <div
        ref={trackRef}
        className="scrollbar-none flex gap-4.5 overflow-x-auto pb-1.5"
        style={{ scrollBehavior: "smooth" }}
      >
        {products.map((product) => (
          <div key={product.id} className="w-[230px] shrink-0">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}
