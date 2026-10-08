import { PriceRangeInput } from "@/components/PriceRangeInput";
import type { BrandWithCount } from "@/types/database";

/** Sidebar filters matching the approved design-system mockup
 *  (Category.dc.html) — brand checkboxes, a price-range slider bounded by
 *  the category's real max price, and an in-stock toggle. The mockup also
 *  has a star-rating filter and subcategory checkboxes; both are omitted
 *  since this catalog has no rating/review data (per the PRD decision not
 *  to build reviews yet) and a flat, single-level category taxonomy (no
 *  subcategories to filter by). Submitted as one plain GET form — no
 *  client-side fetch required, works even without JS. */
export function CategoryFilters({
  categorySlug,
  brands,
  selectedBrandSlugs,
  maxPriceKobo,
  currentMaxPriceKobo,
  inStockOnly,
  hasActiveFilters,
}: {
  categorySlug: string;
  brands: BrandWithCount[];
  selectedBrandSlugs: string[];
  maxPriceKobo: number;
  currentMaxPriceKobo: number;
  inStockOnly: boolean;
  hasActiveFilters: boolean;
}) {
  return (
    <form method="GET" action={`/category/${categorySlug}`} className="w-[260px] shrink-0">
      <div className="mb-1.5 flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-white">Filters</h3>
        {hasActiveFilters && (
          <a
            href={`/category/${categorySlug}`}
            className="text-[12.5px] font-semibold text-accent-400 hover:text-white"
          >
            Clear All
          </a>
        )}
      </div>

      {brands.length > 0 && (
        <div className="border-b border-white/10 py-5">
          <div className="mb-3 text-xs font-bold tracking-wide text-white/70">BRAND</div>
          <div className="flex flex-col">
            {brands.map((b) => (
              <label
                key={b.id}
                className="flex cursor-pointer items-center gap-2 py-1.5 text-[13.5px] text-white/90"
              >
                <input
                  type="checkbox"
                  name="brand"
                  value={b.slug}
                  defaultChecked={selectedBrandSlugs.includes(b.slug)}
                  className="h-4 w-4 accent-accent-500"
                />
                {b.name}
                <span className="ml-auto text-white/35">({b.product_count})</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {maxPriceKobo > 0 && (
        <div className="border-b border-white/10 py-5">
          <div className="mb-3 text-xs font-bold tracking-wide text-white/70">
            PRICE RANGE
          </div>
          <PriceRangeInput max={maxPriceKobo} initial={currentMaxPriceKobo} />
        </div>
      )}

      <div className="py-5">
        <div className="mb-3 text-xs font-bold tracking-wide text-white/70">
          AVAILABILITY
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-[13.5px] text-white/90">
          <input
            type="checkbox"
            name="inStock"
            value="1"
            defaultChecked={inStockOnly}
            className="h-4 w-4 accent-accent-500"
          />
          In Stock Only
        </label>
      </div>

      <button
        type="submit"
        className="mt-2 w-full rounded-full bg-accent-500 py-2.5 text-sm font-semibold text-brand-900 hover:bg-accent-600"
      >
        Apply Filters
      </button>
    </form>
  );
}
