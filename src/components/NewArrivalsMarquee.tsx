"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useMarquee } from "@/hooks/useMarquee";
import type { ProductWithImages } from "@/types/database";

const GAP_PX = 20;

/** Continuous right-to-left rail of the newest products. The viewport is
 *  a CSS container, so each card is sized as an exact fraction of it —
 *  four across on desktop, three on tablet, two on phones — and the list
 *  is rendered twice so the loop is seamless (see useMarquee). Hovering
 *  pauses it so a card can be read and clicked; the arrows step it by
 *  one card. */
export function NewArrivalsMarquee({ products }: { products: ProductWithImages[] }) {
  const { trackRef, nudge, hoverProps } = useMarquee({ speed: 38, direction: "left" });

  if (products.length === 0) return null;

  function step(dir: 1 | -1) {
    const track = trackRef.current;
    const card = track?.firstElementChild as HTMLElement | null;
    const width = (card?.offsetWidth ?? 260) + GAP_PX;
    nudge(-dir * width);
  }

  const loop = [...products, ...products];

  return (
    <section className="mx-auto max-w-[1360px] px-4 pt-16 sm:px-8">
      <SectionHeader
        eyebrow="Just landed"
        title="New Arrivals"
        subtitle="Fresh stock, straight from the manufacturers. Twelve latest additions, always moving."
        action={{ label: "Browse deals", href: "/deals" }}
        className="mb-6"
      />

      <div className="relative">
        <div
          {...hoverProps}
          className="marquee-fade-mask -my-6 overflow-hidden py-8 [container-type:inline-size]"
        >
          <div ref={trackRef} className="flex w-max gap-5 will-change-transform">
            {loop.map((product, i) => (
              <div
                key={`${product.id}-${i < products.length ? "a" : "b"}`}
                className="w-[calc((100cqw-20px)/2)] shrink-0 sm:w-[calc((100cqw-40px)/3)] lg:w-[calc((100cqw-60px)/4)]"
              >
                <ProductCard
                  product={product}
                  sizes="(min-width: 1024px) 320px, (min-width: 640px) 33vw, 50vw"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <p className="text-xs text-neutral-400">Auto-scrolling · {products.length} new items · pauses while you browse</p>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Scroll left"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white transition-colors hover:border-brand-900 hover:bg-brand-900 [&:hover_svg]:stroke-white"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Scroll right"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white transition-colors hover:border-brand-900 hover:bg-brand-900 [&:hover_svg]:stroke-white"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
