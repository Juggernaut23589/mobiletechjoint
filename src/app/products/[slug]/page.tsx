import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { MapPin, RotateCcw, ShieldCheck } from "lucide-react";
import {
  getPublishedProductBySlug,
  getComplementaryProducts,
  getRelatedProducts,
  getVariantOptions,
  getAdPlacements,
  type AdPreview,
} from "@/lib/products";
import { formatNaira, discountPercent } from "@/lib/money";
import { AddToCartForm } from "@/components/AddToCartForm";
import { WishlistButton } from "@/components/WishlistButton";
import { ProductCarousel } from "@/components/ProductCarousel";
import { ProductGallery } from "@/components/ProductGallery";
import { ProductDescription } from "@/components/ProductDescription";
import { DeliveryEstimator } from "@/components/DeliveryEstimator";
import { StarRating } from "@/components/StarRating";
import { ReviewsSection } from "@/components/ReviewsSection";

// See app/page.tsx — same reasoning: stock/price can change (admin edits,
// the Instagram poller flipping a draft to published) between deploys.
export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getPublishedProductBySlug(slug);
  if (!product) return {};
  return {
    title: product.name,
    description: product.description ?? undefined,
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getPublishedProductBySlug(slug);

  if (!product) notFound();

  const [frequentlyBoughtTogether, related, variants, brandAds] = await Promise.all([
    getComplementaryProducts(product.category_id, product.id, 4),
    getRelatedProducts(product.category_id, product.id, 8),
    getVariantOptions(product.variant_group_id),
    product.brand_id ? getAdPlacements("brand", product.brand_id) : Promise.resolve([]),
  ]);

  // price_kobo is NOT NULL for any product with status='published' — enforced
  // by the price_required_when_published CHECK constraint in the migration.
  const priceKobo = product.price_kobo ?? 0;

  const images = product.product_images
    .filter((img) => !img.is_video)
    .sort((a, b) => a.position - b.position);
  const videos = product.product_images
    .filter((img) => img.is_video)
    .sort((a, b) => a.position - b.position);

  const lowStock = product.stock_quantity > 0 && product.stock_quantity <= 5;
  const discount = discountPercent(priceKobo, product.compare_at_price_kobo);
  // Brand ads (up to 2, from the "Customize Brand Assets" dashboard) now
  // bracket the page — one at the very top, one at the very bottom —
  // instead of sitting beside the video. With a single ad configured it
  // only shows at the top.
  const [topAd, bottomAd] = brandAds;

  return (
    <div className="mx-auto max-w-[1360px] px-4 py-6 sm:px-8">
      <div className="mb-5 text-[13px] text-ink/50">
        <Link href="/" className="text-link hover:text-ink">
          Home
        </Link>
        {product.category && (
          <>
            <span className="mx-1.5">/</span>
            <Link
              href={`/category/${product.category.slug}`}
              className="text-link hover:text-ink"
            >
              {product.category.name}
            </Link>
          </>
        )}
        <span className="mx-1.5">/</span>
        <span className="text-ink">{product.name}</span>
      </div>

      {topAd && <BrandAdBanner ad={topAd} className="mb-8" />}

      {/* Not wrapped in any reveal/fade animation: this is the gallery and
          buy button — the single most important content on this page. It
          must never depend on client JS succeeding just to become visible. */}
      <div className="grid gap-10 lg:grid-cols-2 lg:items-start xl:grid-cols-[2fr_1.8fr_1.1fr] xl:gap-8">
        {/* Sticky on desktop so the gallery travels with the page instead of
            leaving blank space once the buy-box column scrolls past it —
            the right column used to be considerably taller than this one. */}
        <div className="lg:sticky lg:top-24">
          <ProductGallery images={images} videos={videos} productName={product.name} />
        </div>

        <div className="flex flex-col gap-1">
          {(product.brand || product.category) && (
            <span className="mb-1.5 text-[12.5px] font-semibold uppercase tracking-wide text-ink/50">
              {product.brand?.name ?? product.category?.name}
            </span>
          )}
          <h1 className="font-display mb-2.5 text-[26px] leading-tight text-ink">
            {product.name}
          </h1>

          {product.rating_count > 0 && product.rating_avg !== null && (
            <a href="#reviews" className="mb-2.5 flex items-center gap-2 text-[13px]">
              <StarRating rating={product.rating_avg} />
              <span className="font-semibold text-ink/80">{product.rating_avg.toFixed(1)}</span>
              <span className="text-ink/40">
                ({product.rating_count} review{product.rating_count === 1 ? "" : "s"})
              </span>
            </a>
          )}

          <div className="mb-4.5 flex flex-wrap items-baseline gap-3">
            <p className="font-display text-[30px] font-bold text-ink">
              {formatNaira(priceKobo)}
            </p>
            {discount !== null && (
              <>
                <p className="text-base text-ink/35 line-through">
                  {formatNaira(product.compare_at_price_kobo!)}
                </p>
                <span className="rounded-full bg-[#16C784] px-2.5 py-1 text-[11px] font-bold text-white">
                  SAVE {discount}%
                </span>
              </>
            )}
          </div>

          {variants.length > 0 && (
            <div className="mb-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink/50">
                Available options
              </p>
              <div className="flex flex-wrap gap-2">
                {variants.map((v) =>
                  v.id === product.id ? (
                    <span
                      key={v.id}
                      aria-current="true"
                      className="rounded-full border-2 border-accent-500 bg-accent-500/15 px-3.5 py-1.5 text-[13px] font-semibold text-link"
                    >
                      {v.label ?? v.name}
                    </span>
                  ) : (
                    <Link
                      key={v.id}
                      href={`/products/${v.slug}`}
                      className={`rounded-full border border-ink/20 px-3.5 py-1.5 text-[13px] font-medium text-ink/70 hover:border-accent-500 hover:text-link ${v.inStock ? "" : "opacity-60"}`}
                    >
                      {v.label ?? v.name}
                      {!v.inStock && " · sold out"}
                    </Link>
                  )
                )}
              </div>
            </div>
          )}

          <div className="mb-5">
            {lowStock ? (
              <p className="w-fit rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
                Only {product.stock_quantity} left in stock
              </p>
            ) : (
              <p className="text-[12.5px] font-semibold text-[#16C784]">
                {product.stock_quantity > 0
                  ? `● In Stock — ${product.stock_quantity} units`
                  : "Currently out of stock"}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-start gap-3">
            <div className="min-w-0 flex-1">
              <AddToCartForm
                productId={product.id}
                slug={product.slug}
                name={product.name}
                priceKobo={priceKobo}
                imageUrl={images[0]?.url ?? null}
                stockQuantity={product.stock_quantity}
                categoryId={product.category_id}
              />
            </div>
            <WishlistButton productId={product.id} showLabel className="shrink-0" />
          </div>

          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-1 text-[12.5px] text-ink/50">
            <div>
              SKU: <strong className="text-ink">{product.id.slice(0, 8).toUpperCase()}</strong>
            </div>
            {product.category && (
              <div>
                Category: <strong className="text-ink">{product.category.name}</strong>
              </div>
            )}
          </div>

          {product.description && <ProductDescription text={product.description} />}
        </div>

        <DeliveryReturnsPanel />
      </div>

      <ReviewsSection
        productId={product.id}
        slug={product.slug}
        ratingAvg={product.rating_avg}
        ratingCount={product.rating_count}
      />

      {frequentlyBoughtTogether.length > 0 && (
        <div className="mt-14 border-t border-neutral-200 pt-10">
          <ProductCarousel title="Frequently Bought Together" products={frequentlyBoughtTogether} />
        </div>
      )}

      {related.length > 0 && (
        <div className="mt-4">
          <ProductCarousel title="You May Also Like" products={related} />
        </div>
      )}

      {bottomAd && <BrandAdBanner ad={bottomAd} className="mt-14" />}
    </div>
  );
}

/** Full-width horizontal brand ad — same banner shape as the homepage
 *  footer ads, used here for the "top and bottom of the page only"
 *  placement instead of the small square tiles that used to sit beside
 *  the video. */
function BrandAdBanner({ ad, className = "" }: { ad: AdPreview; className?: string }) {
  const tile = (
    <div className="relative aspect-[21/6] w-full overflow-hidden rounded-2xl bg-ink/5">
      <Image src={ad.imageUrl} alt={ad.caption ?? ""} fill sizes="(min-width: 640px) 1296px, 100vw" className="object-cover" />
      {ad.caption && (
        <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 py-3 text-sm font-semibold text-white">
          {ad.caption}
        </p>
      )}
    </div>
  );
  return (
    <div className={className}>
      {ad.linkUrl ? (
        <Link href={ad.linkUrl} className="block">
          {tile}
        </Link>
      ) : (
        tile
      )}
    </div>
  );
}

/** Right-side "Delivery & Returns" panel — same information shelf
 *  marketplace product pages (Jumia, Konga) carry beside the buy box,
 *  scaled to what this store can actually back with real data: a live
 *  per-state delivery estimate (DeliveryEstimator, same table checkout
 *  quotes from), the one real pickup address (only rendered if
 *  SUPPORT_ADDRESS is actually set — same no-fabrication pattern as the
 *  footer's contact block), and links into the real Returns & Refunds
 *  policy rather than an invented day-count. Stacks below the buy box
 *  until 2xl, where there's finally room for a true third column. */
function DeliveryReturnsPanel() {
  const pickupAddress = process.env.SUPPORT_ADDRESS;

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-ink/10 bg-ink/[0.02] p-5 2xl:sticky 2xl:top-24">
      <h2 className="text-sm font-bold uppercase tracking-wide text-ink">Delivery &amp; Returns</h2>

      <DeliveryEstimator />

      {pickupAddress && (
        <div className="flex gap-3 border-t border-ink/10 pt-5">
          <MapPin className="mt-0.5 h-[18px] w-[18px] shrink-0 text-ink/60" />
          <div className="min-w-0 flex-1">
            <h3 className="text-[13.5px] font-semibold text-ink">Pickup Station</h3>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink/50">
              Skip delivery and collect in person at {pickupAddress}.{" "}
              <Link href="/contact" className="font-semibold text-link hover:underline">
                Contact us
              </Link>{" "}
              to arrange a pickup time.
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-3 border-t border-ink/10 pt-5">
        <RotateCcw className="mt-0.5 h-[18px] w-[18px] shrink-0 text-ink/60" />
        <div className="min-w-0 flex-1">
          <h3 className="text-[13.5px] font-semibold text-ink">Return Policy</h3>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink/50">
            Faulty, incorrect, or misdescribed items are covered under our{" "}
            <Link href="/returns-refunds" className="font-semibold text-link hover:underline">
              Returns &amp; Refunds Policy
            </Link>
            .
          </p>
        </div>
      </div>

      <div className="flex gap-3 border-t border-ink/10 pt-5">
        <ShieldCheck className="mt-0.5 h-[18px] w-[18px] shrink-0 text-ink/60" />
        <div className="min-w-0 flex-1">
          <h3 className="text-[13.5px] font-semibold text-ink">Warranty</h3>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink/50">
            Covered by the manufacturer&apos;s warranty — see the full description above, or{" "}
            <Link href="/returns-refunds" className="font-semibold text-link hover:underline">
              our warranty policy
            </Link>{" "}
            for how to make a claim.
          </p>
        </div>
      </div>
    </div>
  );
}
