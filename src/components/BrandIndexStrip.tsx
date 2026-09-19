import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import type { BrandWithCount } from "@/types/database";

/** Compact "every brand we stock" chip row under the brand shelves — the
 *  path to manufacturers that didn't make the top eight, plus a category
 *  link for the products with no brand assigned. Replaces the old
 *  all-products grid as the "I want to see everything" escape hatch. */
export function BrandIndexStrip({ brands }: { brands: BrandWithCount[] }) {
  if (brands.length === 0) return null;

  return (
    <RevealOnScroll>
      <section className="rounded-[24px] border border-neutral-200/70 bg-white px-5 py-6 sm:px-8 sm:py-7">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="max-w-sm">
            <span className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-[0.16em] text-accent-500">
              Every manufacturer
            </span>
            <h3 className="font-display text-xl font-bold tracking-tight text-brand-900">
              Looking for a specific brand?
            </h3>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-neutral-500">
              Jump straight to a manufacturer, or browse by category from the menu above.
            </p>
          </div>
          <ul className="flex flex-wrap gap-2">
            {brands.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/brand/${b.slug}`}
                  className="group inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-surface px-3.5 py-2 text-[13px] font-semibold text-neutral-800 transition-all hover:-translate-y-0.5 hover:border-brand-600 hover:bg-brand-50 hover:text-brand-700"
                >
                  {b.name}
                  <span className="text-[11px] font-medium text-neutral-400 group-hover:text-brand-600">
                    {b.product_count}
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </RevealOnScroll>
  );
}
