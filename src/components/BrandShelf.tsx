import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import type { BrandShelf as BrandShelfData } from "@/lib/products";

/** One homepage brand shelf: a gradient spotlight panel (headline, blurb,
 *  stock count) beside the brand's three newest products, with a "See
 *  more" button that opens the paginated brand page. Every other shelf
 *  mirrors the layout so a run of eight doesn't read as one long list. */
export function BrandShelf({ shelf, index }: { shelf: BrandShelfData; index: number }) {
  const { brand, editorial, products } = shelf;
  const href = `/brand/${brand.slug}`;
  const flipped = index % 2 === 1;

  return (
    <section className="mb-10 sm:mb-12">
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-4">
        <RevealOnScroll className={`h-full ${flipped ? "lg:order-last" : ""}`}>
          <Link
            href={href}
            className="group relative flex h-full min-h-[240px] flex-col justify-between overflow-hidden rounded-[22px] p-6 text-white transition-transform duration-300 hover:-translate-y-1.5 hover:shadow-glow lg:min-h-0"
            style={{ background: editorial.gradient }}
          >
            <div className="bg-grid-texture absolute inset-0 opacity-50" aria-hidden="true" />
            <div
              className="absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-30 blur-3xl transition-opacity duration-500 group-hover:opacity-60"
              style={{ background: editorial.accent }}
              aria-hidden="true"
            />

            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white/85 backdrop-blur-sm">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: editorial.accent }}
                  aria-hidden="true"
                />
                {brand.name}
              </span>
              <h2 className="font-display mt-5 text-[26px] font-bold leading-[1.08] tracking-tight sm:text-[30px]">
                {editorial.headline}
              </h2>
              <p className="mt-3 max-w-xs text-[13.5px] leading-relaxed text-white/65">
                {editorial.blurb}
              </p>
            </div>

            <div className="relative mt-8 flex items-center justify-between text-[13px]">
              <span className="text-white/60">
                {brand.product_count} {brand.product_count === 1 ? "product" : "products"} in stock
              </span>
              <span className="inline-flex items-center gap-1.5 font-semibold text-white">
                Shop all
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </Link>
        </RevealOnScroll>

        {/* Phones: a swipeable row. Tablets: three across. Desktop: the
            wrapper dissolves (`contents`) and the cards join the 4-col grid
            beside the spotlight panel. */}
        <div className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 lg:contents">
          {products.map((product, i) => (
            <RevealOnScroll
              key={product.id}
              delay={0.06 * (i + 1)}
              className="h-full w-[68%] shrink-0 snap-start sm:w-auto sm:shrink"
            >
              <ProductCard
                product={product}
                sizes="(min-width: 1024px) 320px, (min-width: 640px) 33vw, 68vw"
              />
            </RevealOnScroll>
          ))}
        </div>
      </div>

      <RevealOnScroll className="mt-5 flex justify-center lg:justify-end">
        <Link
          href={href}
          className="group inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-5 py-2.5 text-[13px] font-semibold text-brand-900 transition-all hover:-translate-y-0.5 hover:border-brand-900 hover:bg-brand-900 hover:text-white"
        >
          See more from {brand.name}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </RevealOnScroll>
    </section>
  );
}
