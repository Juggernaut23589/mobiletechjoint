import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublishedProductsByCategorySlug, getCategoriesWithCounts } from "@/lib/products";
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
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [{ category, products }, categories] = await Promise.all([
    getPublishedProductsByCategorySlug(slug),
    getCategoriesWithCounts(),
  ]);

  if (!category) notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex gap-8">
        <CategorySidebar categories={categories} />

        <div className="min-w-0 flex-1">
          <h1 className="mb-6 text-2xl font-bold tracking-tight text-brand-900">
            {category.name}
          </h1>

          {products.length === 0 ? (
            <p className="text-neutral-500">No products in this category yet.</p>
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
