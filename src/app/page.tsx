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
import { CategoryChips } from "@/components/CategoryChips";
import { CategoryTiles } from "@/components/CategoryTiles";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { TrustStrip } from "@/components/TrustStrip";
import { BouncingProductBackground } from "@/components/BouncingProductBackground";

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
      <section className="relative overflow-hidden bg-brand-900 py-20 sm:py-28">
        <div className="bg-grid-texture pointer-events-none absolute inset-0 opacity-30" />
        <div className="pointer-events-none absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-brand-600/30 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />

        <BouncingProductBackground products={allProducts} />

        <div className="relative mx-auto max-w-3xl px-4 text-center">
          <h1 className="font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Gear for the work you make.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/70">
            Cameras, lighting, audio, and rigging for creators and media teams.
          </p>
        </div>
      </section>

      <HeroCarousel products={featured} />
      <TrustStrip />
      <CategoryTiles categories={categories} />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        <CategoryChips categories={categories} />

        <div className="flex items-start gap-8">
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
