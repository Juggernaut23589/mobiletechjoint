import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import type { ProductWithImages } from "@/types/database";

/** Promotional rail for real deals (admin-set "was" price) — a gradient
 *  banner header so this reads as a moment, not another shelf. Only ever
 *  shows products with a genuine discount; never rendered if there aren't
 *  any (see getDealsProducts). */
export function DealsSection({ products }: { products: ProductWithImages[] }) {
  if (products.length === 0) return null;

  return (
    <section className="mb-14">
      <RevealOnScroll>
        <div className="relative mb-5 overflow-hidden rounded-[22px] bg-gradient-to-r from-red via-[#ff5a4a] to-accent-500 px-6 py-5 text-white shadow-glow-accent sm:px-8">
          <div className="bg-grid-texture absolute inset-0 opacity-40" aria-hidden="true" />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm">
                <Zap className="h-4.5 w-4.5 fill-white" />
              </span>
              <div>
                <span className="block text-[11px] font-bold uppercase tracking-[0.16em] text-white/75">
                  Limited stock
                </span>
                <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
                  Deals — real price cuts
                </h2>
              </div>
            </div>
            <Link
              href="/deals"
              className="group inline-flex items-center gap-1.5 rounded-full bg-white px-4.5 py-2.5 text-[13px] font-semibold text-brand-900 transition-transform hover:-translate-y-0.5"
            >
              See all deals
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </RevealOnScroll>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product, i) => (
          <RevealOnScroll key={product.id} delay={Math.min(i, 4) * 0.05} className="h-full">
            <ProductCard product={product} />
          </RevealOnScroll>
        ))}
      </div>
    </section>
  );
}
