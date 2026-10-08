import { ProductCard } from "@/components/ProductCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { ProductWithImages } from "@/types/database";

export function ProductSection({
  title,
  eyebrow,
  subtitle,
  action,
  products,
}: {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  action?: { label: string; href: string };
  products: ProductWithImages[];
}) {
  if (products.length === 0) return null;

  return (
    <section className="mb-14">
      <SectionHeader eyebrow={eyebrow} title={title} subtitle={subtitle} action={action} />
      {/* Deliberately NOT wrapped in RevealOnScroll — this is merchandising
          a shopper is actively scroll-hunting for, not decoration. A scroll
          past this grid at normal speed left entire rows of product cards
          rendering as blank space until the viewport settled. */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
