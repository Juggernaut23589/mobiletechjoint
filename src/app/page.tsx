import {
  getPublishedProducts,
  getFeaturedProducts,
  getTrendingProducts,
  getNewArrivals,
  getDealsProducts,
  getCategoriesWithCounts,
} from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";
import { ProductSection } from "@/components/ProductSection";
import { DealsSection } from "@/components/DealsSection";
import { HeroCarousel } from "@/components/HeroCarousel";
import { CategorySidebar } from "@/components/CategorySidebar";
import { CategoryTiles } from "@/components/CategoryTiles";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { TrustStrip } from "@/components/TrustStrip";

// Without this, the page is prerendered once at build time and never
// reflects products added afterwards (manual entry, or the Instagram
// poller). 60s keeps it feeling live without hitting Supabase on every
// single request.
export const revalidate = 60;

export default async function HomePage() {
  const [allProducts, featured, trending, newArrivals, deals, categories] = await Promise.all([
    getPublishedProducts(),
    getFeaturedProducts(8),
    getTrendingProducts(8),
    getNewArrivals(8),
    getDealsProducts(8),
    getCategoriesWithCounts(),
  ]);

  return (
    <div>
      <section className="mx-auto max-w-3xl px-4 pb-8 pt-16 text-center sm:pt-24">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          Gear for the work you make.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-neutral-500">
          Cameras, lighting, audio, and rigging for creators and media teams.
        </p>
      </section>

      <HeroCarousel products={featured} />
      <TrustStrip />
      <CategoryTiles categories={categories} />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        <div className="flex gap-8">
          <CategorySidebar categories={categories} />

          <div className="min-w-0 flex-1">
            <DealsSection products={deals} />

            <ProductSection
              title="Trending Now"
              subtitle="Popular with shoppers right now"
              products={trending}
            />

            <ProductSection
              title="New Arrivals"
              subtitle="Just added"
              products={newArrivals}
            />

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
        </div>
      </div>
    </div>
  );
}
