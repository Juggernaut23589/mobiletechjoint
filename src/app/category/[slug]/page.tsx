import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  getPublishedProductsByCategorySlug,
  getCategoryMaxPriceKobo,
  getBrandsForCategory,
} from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";
import { CategoryFilters } from "@/components/CategoryFilters";
import { SortSelect } from "@/components/SortSelect";

export const revalidate = 60;

const PER_PAGE = 24;

type Sort = "featured" | "price_asc" | "price_desc" | "newest";
const VALID_SORTS: Sort[] = ["featured", "price_asc", "price_desc", "newest"];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { category } = await getPublishedProductsByCategorySlug(slug);
  if (!category) return {};
  return { title: category.name };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    brand?: string | string[];
    maxPrice?: string;
    inStock?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  const brandSlugs = sp.brand ? (Array.isArray(sp.brand) ? sp.brand : [sp.brand]) : [];
  const inStockOnly = sp.inStock === "1";
  const maxPrice = sp.maxPrice ? parseInt(sp.maxPrice, 10) : undefined;
  const sort: Sort = VALID_SORTS.includes(sp.sort as Sort) ? (sp.sort as Sort) : "featured";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const { category, products, total } = await getPublishedProductsByCategorySlug(slug, {
    brandSlugs,
    inStockOnly,
    maxPriceKobo: maxPrice,
    sort,
    page,
    perPage: PER_PAGE,
  });

  if (!category) notFound();

  const [brands, categoryMaxPrice] = await Promise.all([
    getBrandsForCategory(category.id),
    getCategoryMaxPriceKobo(category.id),
  ]);

  const hasActiveFilters = brandSlugs.length > 0 || inStockOnly || maxPrice != null;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  function pageHref(p: number) {
    const params = new URLSearchParams();
    brandSlugs.forEach((b) => params.append("brand", b));
    if (inStockOnly) params.set("inStock", "1");
    if (maxPrice != null) params.set("maxPrice", String(maxPrice));
    if (sort !== "featured") params.set("sort", sort);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/category/${slug}${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="mx-auto max-w-[1360px] px-4 py-6 sm:px-8">
      <div className="mb-4.5 text-[13px] text-neutral-500">
        <Link href="/" className="text-brand-600 hover:text-brand-700">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-neutral-900">{category.name}</span>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        <CategoryFilters
          categorySlug={slug}
          brands={brands}
          selectedBrandSlugs={brandSlugs}
          maxPriceKobo={categoryMaxPrice}
          currentMaxPriceKobo={maxPrice ?? categoryMaxPrice}
          inStockOnly={inStockOnly}
          hasActiveFilters={hasActiveFilters}
        />

        <div className="min-w-0 flex-1">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5">
            <div className="text-sm text-neutral-500">
              Showing <strong className="text-neutral-900">{total}</strong> result
              {total === 1 ? "" : "s"}
            </div>
            <SortSelect current={sort} />
          </div>

          {hasActiveFilters && (
            <div className="mb-5 flex flex-wrap gap-2">
              {brandSlugs.map((slug2) => {
                const brand = brands.find((b) => b.slug === slug2);
                if (!brand) return null;
                const remaining = brandSlugs.filter((b) => b !== slug2);
                const params = new URLSearchParams();
                remaining.forEach((b) => params.append("brand", b));
                if (inStockOnly) params.set("inStock", "1");
                if (maxPrice != null) params.set("maxPrice", String(maxPrice));
                if (sort !== "featured") params.set("sort", sort);
                return (
                  <Link
                    key={slug2}
                    href={`/category/${slug}?${params.toString()}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 py-1.5 pl-3 pr-2 text-[12.5px] font-semibold text-brand-700"
                  >
                    {brand.name} <span aria-hidden="true">✕</span>
                  </Link>
                );
              })}
              {inStockOnly &&
                (() => {
                  const params = new URLSearchParams();
                  brandSlugs.forEach((b) => params.append("brand", b));
                  if (maxPrice != null) params.set("maxPrice", String(maxPrice));
                  if (sort !== "featured") params.set("sort", sort);
                  const qs = params.toString();
                  return (
                    <Link
                      href={`/category/${slug}${qs ? `?${qs}` : ""}`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 py-1.5 pl-3 pr-2 text-[12.5px] font-semibold text-brand-700"
                    >
                      In Stock <span aria-hidden="true">✕</span>
                    </Link>
                  );
                })()}
            </div>
          )}

          {products.length === 0 ? (
            <p className="text-neutral-500">
              {hasActiveFilters
                ? "No products match these filters."
                : "No products in this category yet."}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-9 flex justify-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={pageHref(p)}
                  className={`flex h-8.5 w-8.5 items-center justify-center rounded-lg border text-[13px] font-semibold ${
                    p === page
                      ? "border-brand-600 bg-brand-600 text-white"
                      : "border-neutral-200 bg-white text-neutral-900 hover:bg-neutral-50"
                  }`}
                >
                  {p}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
