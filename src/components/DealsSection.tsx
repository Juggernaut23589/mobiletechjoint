import Link from "next/link";
import { Zap } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import type { ProductWithImages } from "@/types/database";

/** A colored banner-header rail for real deals (admin-set "was" price) —
 *  visually distinct from the plain ProductSection headings so this reads
 *  as a promotional moment, not just another category shelf. Only ever
 *  shows products with a genuine discount; never rendered if there aren't
 *  any (see getDealsProducts). */
export function DealsSection({ products }: { products: ProductWithImages[] }) {
  if (products.length === 0) return null;

  return (
    <section className="mb-12">
      <RevealOnScroll>
        <div className="mb-4 flex items-center justify-between rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 px-5 py-3 text-white shadow-glow">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 fill-white" />
            <h2 className="font-display text-base font-bold tracking-tight">
              Deals — Real Price Cuts
            </h2>
          </div>
          <Link href="/deals" className="text-xs font-semibold underline-offset-2 hover:underline">
            See all
          </Link>
        </div>
      </RevealOnScroll>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product, i) => (
          <RevealOnScroll key={product.id} delay={Math.min(i, 4) * 0.05}>
            <ProductCard product={product} />
          </RevealOnScroll>
        ))}
      </div>
    </section>
  );
}
