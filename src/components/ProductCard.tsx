import Link from "next/link";
import Image from "next/image";
import { formatNaira } from "@/lib/money";
import type { ProductWithImages } from "@/types/database";

export function ProductCard({ product }: { product: ProductWithImages }) {
  const cover =
    product.product_images
      .filter((img) => !img.is_video)
      .sort((a, b) => a.position - b.position)[0] ?? null;

  const outOfStock = product.stock_quantity <= 0;

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex flex-col rounded-lg border border-neutral-200 bg-white overflow-hidden transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-square bg-neutral-100">
        {cover ? (
          <Image
            src={cover.url}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-neutral-400">
            No image
          </div>
        )}
        {outOfStock && (
          <span className="absolute top-2 left-2 rounded bg-neutral-900/80 px-2 py-1 text-xs font-medium text-white">
            Out of stock
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        {product.category && (
          <span className="text-xs text-neutral-500">{product.category.name}</span>
        )}
        <h3 className="line-clamp-2 text-sm font-medium text-neutral-900">
          {product.name}
        </h3>
        <p className="mt-auto text-base font-semibold text-neutral-900">
          {/* price_kobo is NOT NULL for any product with status='published' —
              enforced by the price_required_when_published CHECK constraint. */}
          {formatNaira(product.price_kobo ?? 0)}
        </p>
      </div>
    </Link>
  );
}
