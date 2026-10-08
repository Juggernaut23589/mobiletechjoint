import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  getPublishedProductBySlug,
  getComplementaryProducts,
  getRelatedProducts,
  getVariantOptions,
} from "@/lib/products";
import { formatNaira, discountPercent } from "@/lib/money";
import { AddToCartForm } from "@/components/AddToCartForm";
import { ProductCarousel } from "@/components/ProductCarousel";
import { ProductGallery } from "@/components/ProductGallery";
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

  const [frequentlyBoughtTogether, related, variants] = await Promise.all([
    getComplementaryProducts(product.category_id, product.id, 4),
    getRelatedProducts(product.category_id, product.id, 8),
    getVariantOptions(product.variant_group_id),
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

  return (
    <div className="mx-auto max-w-[1360px] px-4 py-6 sm:px-8">
      <div className="mb-5 text-[13px] text-neutral-500">
        <Link href="/" className="text-brand-600 hover:text-brand-700">
          Home
        </Link>
        {product.category && (
          <>
            <span className="mx-1.5">/</span>
            <Link
              href={`/category/${product.category.slug}`}
              className="text-brand-600 hover:text-brand-700"
            >
              {product.category.name}
            </Link>
          </>
        )}
        <span className="mx-1.5">/</span>
        <span className="text-neutral-900">{product.name}</span>
      </div>

      {/* Not wrapped in any reveal/fade animation: this is the gallery and
          buy button — the single most important content on this page. It
          must never depend on client JS succeeding just to become visible. */}
      <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
        {/* Sticky on desktop so the gallery travels with the page instead of
            leaving blank space once the buy-box column scrolls past it —
            the right column used to be considerably taller than this one. */}
        <div className="lg:sticky lg:top-24">
          <ProductGallery images={images} videos={videos} productName={product.name} />
        </div>

        <div className="flex flex-col gap-1">
          {(product.brand || product.category) && (
            <span className="mb-1.5 text-[12.5px] font-semibold uppercase tracking-wide text-neutral-500">
              {product.brand?.name ?? product.category?.name}
            </span>
          )}
          <h1 className="font-display mb-2.5 text-[26px] leading-tight text-brand-900">
            {product.name}
          </h1>

          {product.rating_count > 0 && product.rating_avg !== null && (
            <a href="#reviews" className="mb-2.5 flex items-center gap-2 text-[13px]">
              <StarRating rating={product.rating_avg} />
              <span className="font-semibold text-neutral-700">{product.rating_avg.toFixed(1)}</span>
              <span className="text-neutral-400">
                ({product.rating_count} review{product.rating_count === 1 ? "" : "s"})
              </span>
            </a>
          )}

          <div className="mb-4.5 flex flex-wrap items-baseline gap-3">
            <p className="font-display text-[30px] font-bold text-brand-900">
              {formatNaira(priceKobo)}
            </p>
            {discount !== null && (
              <>
                <p className="text-base text-neutral-400 line-through">
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
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Available options
              </p>
              <div className="flex flex-wrap gap-2">
                {variants.map((v) =>
                  v.id === product.id ? (
                    <span
                      key={v.id}
                      aria-current="true"
                      className="rounded-full border-2 border-brand-600 bg-brand-50 px-3.5 py-1.5 text-[13px] font-semibold text-brand-700"
                    >
                      {v.label ?? v.name}
                    </span>
                  ) : (
                    <Link
                      key={v.id}
                      href={`/products/${v.slug}`}
                      className={`rounded-full border border-neutral-300 px-3.5 py-1.5 text-[13px] font-medium text-neutral-700 hover:border-brand-600 hover:text-brand-700 ${v.inStock ? "" : "opacity-60"}`}
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

          <AddToCartForm
            productId={product.id}
            slug={product.slug}
            name={product.name}
            priceKobo={priceKobo}
            imageUrl={images[0]?.url ?? null}
            stockQuantity={product.stock_quantity}
            categoryId={product.category_id}
          />

          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-1 text-[12.5px] text-neutral-500">
            <div>
              SKU: <strong className="text-neutral-900">{product.id.slice(0, 8).toUpperCase()}</strong>
            </div>
            {product.category && (
              <div>
                Category: <strong className="text-neutral-900">{product.category.name}</strong>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* The full manufacturer description now lives here, collapsed by
          default, instead of standing between the shopper and the Add to
          Cart button above — it used to push the buy box several screens
          down on products with long migrated copy. */}
      {product.description && (
        <details className="mt-12 max-w-3xl border-t border-neutral-200 pt-8">
          <summary className="cursor-pointer text-base font-semibold text-brand-900">
            Full description
          </summary>
          <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-neutral-600">
            {product.description}
          </p>
        </details>
      )}

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

      <ReviewsSection
        productId={product.id}
        slug={product.slug}
        ratingAvg={product.rating_avg}
        ratingCount={product.rating_count}
      />
    </div>
  );
}
