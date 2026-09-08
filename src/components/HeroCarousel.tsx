import Link from "next/link";
import Image from "next/image";
import { formatNaira } from "@/lib/money";
import type { ProductWithImages } from "@/types/database";

/** Auto-scrolling "hot picks" strip under the navbar. Pure CSS animation
 *  (see .marquee-track in globals.css) — no client JS needed. The product
 *  list is rendered twice back-to-back so the loop is seamless. */
export function HeroCarousel({ products }: { products: ProductWithImages[] }) {
  if (products.length === 0) return null;

  const track = [...products, ...products];

  return (
    <section className="overflow-hidden bg-gradient-to-r from-brand-900 via-brand-700 to-brand-900 py-6">
      <div className="mb-3 px-4">
        <h2 className="mx-auto max-w-7xl text-sm font-semibold uppercase tracking-wider text-accent-400">
          Hot Picks Right Now
        </h2>
      </div>
      <div className="flex w-max marquee-track">
        {track.map((product, i) => (
          <Link
            key={`${product.id}-${i}`}
            href={`/products/${product.slug}`}
            className="mx-3 flex w-40 shrink-0 flex-col overflow-hidden rounded-lg bg-white shadow-lg sm:w-48"
          >
            <div className="relative aspect-square bg-neutral-100">
              {product.product_images[0] ? (
                <Image
                  src={product.product_images[0].url}
                  alt={product.name}
                  fill
                  sizes="192px"
                  className="object-cover"
                />
              ) : null}
            </div>
            <div className="p-2">
              <p className="line-clamp-1 text-xs font-medium text-neutral-800">
                {product.name}
              </p>
              <p className="text-sm font-bold text-brand-700">
                {formatNaira(product.price_kobo ?? 0)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
