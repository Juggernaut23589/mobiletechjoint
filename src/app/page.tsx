import {
  getFeaturedProducts,
  getNewArrivals,
  getDealsProducts,
  getCategoriesWithCounts,
  getHeroBrandShowcase,
  getBrandShelves,
  getBrandsWithCounts,
} from "@/lib/products";
import { FAQS } from "@/lib/faqs";
import { ProductSection } from "@/components/ProductSection";
import { DealsSection } from "@/components/DealsSection";
import { HeroCarousel } from "@/components/HeroCarousel";
import { CategoryQuickGrid } from "@/components/CategoryQuickGrid";
import { PromoBanner } from "@/components/PromoBanner";
import { NewArrivalsMarquee } from "@/components/NewArrivalsMarquee";
import { BrandShelf } from "@/components/BrandShelf";
import { BrandIndexStrip } from "@/components/BrandIndexStrip";
import { FaqCarousel } from "@/components/FaqCarousel";
import { TeamSection } from "@/components/TeamSection";
import { NewsletterForm } from "@/components/NewsletterForm";
import { SectionHeader } from "@/components/ui/SectionHeader";

// Without this, the page is prerendered once at build time and never
// reflects products added afterwards (manual entry, or the Instagram
// poller). 60s keeps it feeling live without hitting Supabase on every
// single request.
export const revalidate = 60;

const BRAND_SHELVES = 8;
const PRODUCTS_PER_SHELF = 3;
const NEW_ARRIVALS = 12;

export default async function HomePage() {
  const [featured, newArrivals, deals, categories, heroBrandSlides, allBrands] =
    await Promise.all([
      getFeaturedProducts(8),
      getNewArrivals(NEW_ARRIVALS),
      getDealsProducts(8),
      getCategoriesWithCounts(),
      getHeroBrandShowcase(),
      getBrandsWithCounts(),
    ]);

  const alreadyShown = [...featured, ...newArrivals, ...deals].map((p) => p.id);
  const shelves = await getBrandShelves(BRAND_SHELVES, PRODUCTS_PER_SHELF, alreadyShown);

  return (
    <div>
      <HeroCarousel brandSlides={heroBrandSlides} />
      <CategoryQuickGrid categories={categories} />
      <PromoBanner />
      <NewArrivalsMarquee products={newArrivals} />

      <div className="mx-auto max-w-[1360px] px-4 pt-16 sm:px-8">
        <ProductSection
          eyebrow="Creator favourites"
          title="Hot Selling"
          subtitle="The gear our customers keep coming back for."
          products={featured}
        />
        <DealsSection products={deals} />

        {shelves.length > 0 && (
          <div className="pt-2">
            <SectionHeader
              eyebrow="Shop by brand"
              title="Straight from the manufacturers we trust"
              subtitle="Three fresh picks from each of our top brands. Open a brand to browse everything we stock from them."
              className="mb-9"
            />
            {shelves.map((shelf, i) => (
              <BrandShelf key={shelf.brand.id} shelf={shelf} index={i} />
            ))}
          </div>
        )}

        <div className="pb-16">
          <BrandIndexStrip brands={allBrands} />
        </div>
      </div>

      <FaqCarousel faqs={FAQS} />

      <section className="bg-brand-900 px-4 py-16 text-center sm:px-8">
        <div className="bg-grid-texture mx-auto max-w-[1360px] rounded-[28px] px-6 py-10 sm:py-12">
          <span className="mb-3 inline-block text-[11.5px] font-bold uppercase tracking-[0.16em] text-accent-400">
            Stay in the loop
          </span>
          <h2 className="font-display mb-2.5 text-2xl font-bold text-white sm:text-3xl">
            Get first access to drops &amp; deals
          </h2>
          <p className="mb-7 text-sm text-white/60">
            Weekly gear picks, no spam. Unsubscribe anytime.
          </p>
          <NewsletterForm />
        </div>
      </section>

      <TeamSection />
    </div>
  );
}
