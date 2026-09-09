import type { Metadata } from "next";
import { Zap } from "lucide-react";
import { getDealsProducts } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Deals",
  description: "Products with a real, admin-verified price cut.",
};

export default async function DealsPage() {
  const products = await getDealsProducts();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-center gap-2 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 px-5 py-4 text-white shadow-glow">
        <Zap className="h-5 w-5 fill-white" />
        <h1 className="font-display text-xl font-bold tracking-tight">Deals — Real Price Cuts</h1>
      </div>

      {products.length === 0 ? (
        <p className="text-neutral-500">No active deals right now — check back soon.</p>
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
