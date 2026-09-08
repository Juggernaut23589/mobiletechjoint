import { ProductCard } from "@/components/ProductCard";
import type { ProductWithImages } from "@/types/database";

export function ProductSection({
  title,
  subtitle,
  products,
}: {
  title: string;
  subtitle?: string;
  products: ProductWithImages[];
}) {
  if (products.length === 0) return null;

  return (
    <section className="mb-10">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-lg font-bold tracking-tight text-brand-900">{title}</h2>
        {subtitle && <span className="text-xs text-neutral-500">{subtitle}</span>}
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
