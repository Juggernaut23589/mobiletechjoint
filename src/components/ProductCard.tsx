import Link from "next/link";
import Image from "next/image";
import { formatNaira, discountPercent } from "@/lib/money";
import { QuickAddButton } from "@/components/QuickAddButton";
import type { ProductWithImages } from "@/types/database";

const RECENT_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

export function ProductCard({ product }: { product: ProductWithImages }) {
  const cover =
    product.product_images
      .filter((img) => !img.is_video)
      .sort((a, b) => a.position - b.position)[0] ?? null;

  const outOfStock = product.stock_quantity <= 0;
  const isNew = Date.now() - new Date(product.created_at).getTime() < RECENT_MS;
  const priceKobo = product.price_kobo ?? 0;
  const discount = discountPercent(priceKobo, product.compare_at_price_kobo);

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-neutral-200/70 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-transparent hover:shadow-glow">
      <Link href={`/products/${product.slug}`} className="flex flex-1 flex-col">
        <div className="relative aspect-square overflow-hidden bg-neutral-100">
          {cover ? (
            <Image
              src={cover.url}
              alt={product.name}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              className="object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-neutral-400">
              No image
            </div>
          )}

          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {outOfStock && (
              <span className="rounded-full bg-neutral-900/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                Out of stock
              </span>
            )}
            {!outOfStock && discount !== null && (
              <span className="rounded-full bg-red-500 px-2 py-1 text-[10px] font-bold text-white">
                -{discount}%
              </span>
            )}
            {!outOfStock && discount === null && isNew && (
              <span className="bg-accent-gradient rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-brand-900">
                New
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-1 p-3">
          {product.brand ? (
            <span className="text-xs font-medium text-brand-600">{product.brand.name}</span>
          ) : product.category ? (
            <span className="text-xs font-medium text-brand-600">{product.category.name}</span>
          ) : null}
          <h3 className="line-clamp-2 text-sm font-medium text-neutral-900">{product.name}</h3>
          <div className="mt-auto flex items-baseline gap-2">
            {/* price_kobo is NOT NULL for any product with status='published' —
                enforced by the price_required_when_published CHECK constraint. */}
            <p className="font-display text-base font-bold text-brand-900">
              {formatNaira(priceKobo)}
            </p>
            {discount !== null && (
              <p className="text-xs text-neutral-400 line-through">
                {formatNaira(product.compare_at_price_kobo!)}
              </p>
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
