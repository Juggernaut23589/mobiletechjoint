import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import {
  getFeaturedProducts,
  getNewArrivals,
  getDealsProducts,
  getHeroBrandShowcase,
  getBrandShelves,
  getAdPlacements,
} from "@/lib/products";
import { FAQS } from "@/lib/faqs";
import { ProductSection } from "@/components/ProductSection";
import { DealsSection } from "@/components/DealsSection";
import { HeroCarousel } from "@/components/HeroCarousel";
import { PromoBanner } from "@/components/PromoBanner";
import { NewArrivalsMarquee } from "@/components/NewArrivalsMarquee";
import { BrandShelf } from "@/components/BrandShelf";
import { FaqCarousel } from "@/components/FaqCarousel";
import { TeamSection } from "@/components/TeamSection";
import { NewsletterForm } from "@/components/NewsletterForm";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { CategorySidebar } from "@/components/CategorySidebar";

// Without this, the page is prerendered once at build time and never
// reflects products added afterwards (manual entry, or the Instagram
// poller). 60s keeps it feeling live without hitting Supabase on every
// single request.
export const revalidate = 60;

// Was 8 — a long run of brand shelves (each already a spotlight panel +
// 3 products) made the homepage read as repetitive. The full catalogue
// of brands is still one click away via "View all brands" below.
const BRAND_SHELVES = 3;
const PRODUCTS_PER_SHELF = 3;
const NEW_ARRIVALS = 12;

export default async function HomePage() {
  const [featured, newArrivals, deals, heroBrandSlides, footerAds] =
    await Promise.all([
      getFeaturedProducts(8),
      getNewArrivals(NEW_ARRIVALS),
      getDealsProducts(8),
      getHeroBrandShowcase(),
      getAdPlacements("homepage"),
    ]);

  const alreadyShown = [...featured, ...newArrivals, ...deals].map((p) => p.id);
  const shelves = await getBrandShelves(BRAND_SHELVES, PRODUCTS_PER_SHELF, alreadyShown);

  return (
    <div>
      <HeroCarousel brandSlides={heroBrandSlides} />
      <PromoBanner />
      <NewArrivalsMarquee products={newArrivals} />

      <div className="mx-auto max-w-[1360px] px-4 pt-16 sm:px-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          <CategorySidebar />

          <div className="min-w-0 flex-1">
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

            <div className="flex justify-center pb-16">
              <Link
                href="/brands"
                className="group inline-flex items-center gap-2 rounded-full border border-ink/15 bg-ink/[0.03] px-6 py-3 text-sm font-semibold text-ink transition-all hover:-translate-y-0.5 hover:border-accent-500 hover:text-link"
              >
                View all brands
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
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

      {footerAds.length > 0 && (
        <section className="mx-auto max-w-[1360px] px-4 pb-16 sm:px-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {footerAds.map((ad) => {
              const tile = (
                <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-ink/5">
                  <Image src={ad.imageUrl} alt={ad.caption ?? ""} fill sizes="(min-width: 1024px) 33vw, 100vw" className="object-cover" />
                  {ad.caption && (
                    <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 py-3 text-sm font-semibold text-white">
                      {ad.caption}
                    </p>
                  )}
                </div>
              );
              return ad.linkUrl ? (
                <Link key={ad.id} href={ad.linkUrl} className="block">
                  {tile}
                </Link>
              ) : (
                <div key={ad.id}>{tile}</div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
