import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import { getPublishedProductBySlug, getComplementaryProducts } from "@/lib/products";
import { formatNaira } from "@/lib/money";
import { AddToCartForm } from "@/components/AddToCartForm";
import { ProductSection } from "@/components/ProductSection";

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
  const cover = images[0] ?? null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="grid gap-8 md:grid-cols-2">
        {/* Media: images + any Instagram video, all re-hosted in Supabase Storage */}
        <div className="flex flex-col gap-3">
          <div className="relative aspect-square overflow-hidden rounded-lg bg-neutral-100">
            {cover ? (
              <Image
                src={cover.url}
                alt={product.name}
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center text-neutral-400">
                No image
              </div>
            )}
          </div>

          {images.length > 1 && (
            <div className="grid grid-cols-5 gap-2">
              {images.slice(1).map((img) => (
                <div
                  key={img.id}
                  className="relative aspect-square overflow-hidden rounded-md bg-neutral-100"
                >
                  <Image
                    src={img.url}
                    alt={product.name}
                    fill
                    sizes="100px"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          )}

          {videos.map((video) => (
            <video
              key={video.id}
              src={video.url}
              controls
              playsInline
              className="w-full rounded-lg bg-black"
            />
          ))}
        </div>

        {/* Details + purchase */}
        <div className="flex flex-col gap-4">
          {product.category && (
            <span className="text-sm font-medium text-brand-600">{product.category.name}</span>
          )}
          <h1 className="text-2xl font-bold tracking-tight text-brand-900">{product.name}</h1>
          <p className="text-2xl font-bold text-brand-900">{formatNaira(priceKobo)}</p>

          {product.description && (
            <p className="whitespace-pre-line text-neutral-700">
              {product.description}
            </p>
          )}

          <p className="text-sm text-neutral-500">
            {product.stock_quantity > 0
              ? `${product.stock_quantity} in stock`
              : "Currently out of stock"}
          </p>

          <AddToCartForm
            productId={product.id}
            slug={product.slug}
            name={product.name}
            priceKobo={priceKobo}
            imageUrl={cover?.url ?? null}
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
