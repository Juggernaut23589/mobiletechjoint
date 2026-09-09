import Link from "next/link";
import Image from "next/image";
import { Flame } from "lucide-react";
import { formatNaira } from "@/lib/money";
import type { ProductWithImages } from "@/types/database";

/** Auto-scrolling "hot picks" strip under the navbar. Pure CSS animation
 *  (see .marquee-track in globals.css) — no client JS needed. The product
 *  list is rendered twice back-to-back so the loop is seamless. */
export function HeroCarousel({ products }: { products: ProductWithImages[] }) {
  if (products.length === 0) return null;

  const track = [...products, ...products];

  return (
    <section className="relative overflow-hidden bg-merch-gradient py-8">
      <div className="bg-grid-texture pointer-events-none absolute inset-0 opacity-40" />
      <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-brand-500/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-accent-500/20 blur-3xl" />

      <div className="relative mb-4 px-4">
        <div className="mx-auto flex max-w-7xl items-center gap-2">
          <Flame className="h-4 w-4 text-accent-400 animate-pulse-glow" strokeWidth={2.5} />
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-accent-400">
            Hot Picks Right Now
          </h2>
        </div>
      </div>

      <div className="relative marquee-fade-mask">
        <div className="flex w-max marquee-track">
          {track.map((product, i) => (
            <Link
              key={`${product.id}-${i}`}
              href={`/products/${product.slug}`}
              className="mx-3 flex w-40 shrink-0 flex-col overflow-hidden rounded-2xl bg-white shadow-glow transition-transform hover:-translate-y-1 sm:w-48"
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
              <div className="p-3">
                <p className="line-clamp-1 text-xs font-medium text-neutral-800">
                  {product.name}
                </p>
                <p className="font-display text-sm font-bold text-brand-700">
                  {formatNaira(product.price_kobo ?? 0)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
