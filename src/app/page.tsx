import { getPublishedProducts } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";

// Without this, the page is prerendered once at build time and never
// reflects products added afterwards (manual entry, or the Instagram
// poller). 60s keeps it feeling live without hitting Supabase on every
// single request.
export const revalidate = 60;

export default async function HomePage() {
  const products = await getPublishedProducts();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">All Products</h1>

      {products.length === 0 ? (
        <p className="text-neutral-500">
          No products published yet. Check back soon.
        </p>
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
