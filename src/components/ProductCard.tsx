import Link from "next/link";
import Image from "next/image";
import { formatNaira, discountPercent } from "@/lib/money";
import { QuickAddButton } from "@/components/QuickAddButton";
import { isRecentlyAdded } from "@/lib/recency";
import type { ProductWithImages } from "@/types/database";

export function ProductCard({
  product,
  sizes = "(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw",
}: {
  product: ProductWithImages;
  sizes?: string;
}) {
  const cover =
    product.product_images
      .filter((img) => !img.is_video)
      .sort((a, b) => a.position - b.position)[0] ?? null;

  const outOfStock = product.stock_quantity <= 0;
  const isNew = isRecentlyAdded(product.created_at);
  const priceKobo = product.price_kobo ?? 0;
  const discount = discountPercent(priceKobo, product.compare_at_price_kobo);
  const lowStock = !outOfStock && product.stock_quantity <= 3;

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-[20px] border border-neutral-200/60 bg-white transition-all duration-300 [container-type:inline-size] hover:-translate-y-1.5 hover:border-transparent hover:shadow-glow">
      <Link href={`/products/${product.slug}`} className="flex flex-1 flex-col">
        <div className="relative aspect-square overflow-hidden bg-gradient-to-b from-[#f7f8fb] to-[#eef0f6]">
          {cover ? (
            <Image
              src={cover.url}
              alt={product.name}
              fill
              sizes={sizes}
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-neutral-400">
              No image
            </div>
          )}

          <div className="absolute top-2.5 left-2.5 flex flex-col items-start gap-1">
            {outOfStock && (
              <span className="rounded-full bg-brand-900/85 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
                Out of stock
              </span>
            )}
            {!outOfStock && discount !== null && (
              <span className="rounded-full bg-red px-2.5 py-1 text-[10px] font-bold text-white">
                -{discount}%
              </span>
            )}
            {!outOfStock && discount === null && isNew && (
              <span className="bg-accent-gradient rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                New
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-1.5 p-3.5 pt-3">
          {product.brand ? (
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-brand-600">
              {product.brand.name}
            </span>
          ) : product.category ? (
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-brand-600">
              {product.category.name}
            </span>
          ) : null}
          <h3 className="line-clamp-2 text-[13.5px] font-medium leading-snug text-neutral-900">
            {product.name}
          </h3>
          <div className="mt-auto flex items-end justify-between gap-2 pt-1">
            <div className="flex flex-wrap items-baseline gap-x-2">
              {/* price_kobo is NOT NULL for any product with status='published' —
                  enforced by the price_required_when_published CHECK constraint. */}
              <p className="font-display text-[15.5px] font-bold text-brand-900">
                {formatNaira(priceKobo)}
              </p>
              {discount !== null && (
                <p className="text-xs text-neutral-400 line-through">
                  {formatNaira(product.compare_at_price_kobo!)}
                </p>
              )}
            </div>
            {lowStock && (
              <span className="text-[10.5px] font-semibold text-accent-600">
                Only {product.stock_quantity} left
              </span>
            )}
          </div>
        </div>
      </Link>

      <QuickAddButton
        productId={product.id}
        slug={product.slug}
        name={product.name}
        priceKobo={product.price_kobo ?? 0}
        imageUrl={cover?.url ?? null}
        categoryId={product.category_id}
        outOfStock={outOfStock}
      />
    </div>
  );
}
