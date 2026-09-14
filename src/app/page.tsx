import {
  getPublishedProducts,
  getFeaturedProducts,
  getNewArrivals,
  getDealsProducts,
  getCategoriesWithCounts,
} from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";
import { ProductSection } from "@/components/ProductSection";
import { DealsSection } from "@/components/DealsSection";
import { HeroSection } from "@/components/HeroSection";
import { CategoryQuickGrid } from "@/components/CategoryQuickGrid";
import { PromoBanner } from "@/components/PromoBanner";
import { ProductCarousel } from "@/components/ProductCarousel";
import { NewsletterForm } from "@/components/NewsletterForm";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";

// Without this, the page is prerendered once at build time and never
// reflects products added afterwards (manual entry, or the Instagram
// poller). 60s keeps it feeling live without hitting Supabase on every
// single request.
export const revalidate = 60;

export default async function HomePage() {
  const [allProducts, featured, newArrivals, deals, categories] = await Promise.all([
    getPublishedProducts(),
    getFeaturedProducts(8),
    getNewArrivals(8),
    getDealsProducts(8),
    getCategoriesWithCounts(),
  ]);

  return (
    <div>
      <HeroSection />
      <CategoryQuickGrid categories={categories} />
      <PromoBanner />
      <ProductCarousel title="New Arrivals" products={newArrivals} />

      <div className="mx-auto max-w-[1360px] px-4 pt-14 sm:px-8">
        <ProductSection title="Hot Selling" products={featured} />
        <DealsSection products={deals} />

        <section>
          <RevealOnScroll className="mb-4">
            <h2 className="font-display text-lg font-bold tracking-tight text-brand-900">
              All Products
            </h2>
          </RevealOnScroll>
          {allProducts.length === 0 ? (
            <p className="text-neutral-500">
              No products published yet. Check back soon.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {allProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="mt-[70px] bg-brand-900 px-4 py-16 text-center sm:px-8">
        <h2 className="font-display mb-2.5 text-2xl text-white">
          Get first access to drops &amp; deals
        </h2>
        <p className="mb-6.5 text-sm text-white/60">
          Weekly gear picks, no spam. Unsubscribe anytime.
        </p>
        <NewsletterForm />
      </section>
    </div>
  );
}
