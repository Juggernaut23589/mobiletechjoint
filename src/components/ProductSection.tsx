import { ProductCard } from "@/components/ProductCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
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
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product, i) => (
          <RevealOnScroll key={product.id} delay={Math.min(i, 4) * 0.05} className="h-full">
            <ProductCard product={product} />
          </RevealOnScroll>
        ))}
      </div>
    </section>
  );
}
