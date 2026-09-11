import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  getPublishedProductsByCategorySlug,
  getCategoriesWithCounts,
  getBrandsForCategory,
} from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";
import { CategorySidebar } from "@/components/CategorySidebar";

export const revalidate = 60;

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
  searchParams: Promise<{ brand?: string }>;
}) {
  const { slug } = await params;
  const { brand: brandSlug } = await searchParams;

  const [{ category, products }, categories] = await Promise.all([
    getPublishedProductsByCategorySlug(slug, brandSlug),
    getCategoriesWithCounts(),
  ]);

  if (!category) notFound();

  const brands = await getBrandsForCategory(category.id);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
      <div className="flex items-start gap-8">
        <CategorySidebar categories={categories} />

        <div className="min-w-0 flex-1">
          <h1 className="mb-4 text-2xl font-bold tracking-tight text-brand-900">
            {category.name}
          </h1>

          {brands.length > 0 && (
            <div className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1">
              <Link
                href={`/category/${slug}`}
                className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium whitespace-nowrap ${
                  !brandSlug
                    ? "border-brand-700 bg-brand-700 text-white"
                    : "border-neutral-200 bg-white text-neutral-700"
                }`}
              >
                All brands
              </Link>
              {brands.map((brand) => (
                <Link
                  key={brand.id}
                  href={`/category/${slug}?brand=${brand.slug}`}
                  className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium whitespace-nowrap ${
                    brandSlug === brand.slug
                      ? "border-brand-700 bg-brand-700 text-white"
                      : "border-neutral-200 bg-white text-neutral-700"
                  }`}
                >
                  {brand.name} <span className="opacity-70">({brand.product_count})</span>
                </Link>
              ))}
            </div>
          )}

          {products.length === 0 ? (
            <p className="text-neutral-500">
              {brandSlug
                ? "No products from this brand in this category yet."
                : "No products in this category yet."}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
