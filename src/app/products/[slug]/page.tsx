import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublishedProductBySlug, getComplementaryProducts } from "@/lib/products";
import { formatNaira, discountPercent } from "@/lib/money";
import { AddToCartForm } from "@/components/AddToCartForm";
import { ProductSection } from "@/components/ProductSection";
import { ProductGallery } from "@/components/ProductGallery";

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

  const related = await getComplementaryProducts(product.category_id, product.id, 4);

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
    <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
      {/* Not RevealOnScroll-wrapped: this is the gallery and buy button —
          the single most important content on this page. It must never
          depend on client JS succeeding just to become visible. */}
      <div className="grid gap-8 md:grid-cols-2">
        <ProductGallery images={images} videos={videos} productName={product.name} />

        <div className="flex flex-col gap-4">
          {(product.brand || product.category) && (
            <span className="text-sm font-medium text-brand-600">
              {product.brand?.name ?? product.category?.name}
            </span>
          )}
          <h1 className="font-display text-2xl font-bold tracking-tight text-brand-900">
            {product.name}
          </h1>
          <div className="flex items-baseline gap-3">
            <p className="font-display text-3xl font-bold text-brand-900">
              {formatNaira(priceKobo)}
            </p>
            {discount !== null && (
              <>
                <p className="text-lg text-neutral-400 line-through">
                  {formatNaira(product.compare_at_price_kobo!)}
                </p>
                <span className="rounded-full bg-red-500 px-2 py-1 text-xs font-bold text-white">
                  -{discount}%
                </span>
              </>
            )}
          </div>

          {product.description && (
            <p className="whitespace-pre-line text-neutral-700">{product.description}</p>
          )}

          {lowStock && (
            <p className="w-fit rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
              Only {product.stock_quantity} left in stock
            </p>
          )}
          {!lowStock && (
            <p className="text-sm text-neutral-500">
              {product.stock_quantity > 0
                ? `${product.stock_quantity} in stock`
                : "Currently out of stock"}
            </p>
          )}

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
      </div>

      {related.length > 0 && (
        <div className="mt-12 border-t border-neutral-200 pt-8">
          <ProductSection title="You may also like" products={related} />
        </div>
      )}
    </div>
  );
}
