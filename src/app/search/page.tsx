import type { Metadata } from "next";
import { searchProducts } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
  const { q } = await searchParams;
  return { title: q ? `Search: ${q}` : "Search" };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const products = query ? await searchProducts(query) : [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
      <h1 className="font-display mb-1 text-2xl font-bold tracking-tight text-brand-900">
        {query ? `Results for "${query}"` : "Search"}
      </h1>
      <p className="mb-8 text-sm text-neutral-500">
        {query
          ? `${products.length} product${products.length === 1 ? "" : "s"} found`
          : "Search for cameras, mics, gimbals, and more."}
      </p>

      {query && products.length === 0 ? (
        <p className="text-neutral-500">No products matched your search.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
