import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getPublishedProductsByBrandSlug } from "@/lib/products";
import { brandEditorial } from "@/lib/brand-editorial";
import { ProductCard } from "@/components/ProductCard";
import { Pagination } from "@/components/Pagination";

export const revalidate = 60;

const PER_PAGE = 10;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { brand, total } = await getPublishedProductsByBrandSlug(slug, { perPage: 1 });
  if (!brand) return {};
  const editorial = brandEditorial(brand.slug, brand.name);
  return {
    title: `${brand.name} — ${total} product${total === 1 ? "" : "s"}`,
    description: editorial.blurb,
  };
}

export default async function BrandPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const { brand, products, total } = await getPublishedProductsByBrandSlug(slug, {
    page,
    perPage: PER_PAGE,
  });

  if (!brand) notFound();

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  // A stale link to a page past the end (stock got archived) lands on the
  // last real page instead of an empty grid.
  if (page > totalPages) redirect(hrefFor(totalPages));

  function hrefFor(p: number) {
    return p > 1 ? `/brand/${slug}?page=${p}` : `/brand/${slug}`;
  }

  const editorial = brandEditorial(brand.slug, brand.name);
  const first = (page - 1) * PER_PAGE + 1;
  const last = Math.min(page * PER_PAGE, total);

  return (
    <div>
      <section
        className="relative overflow-hidden text-white"
        style={{ background: editorial.gradient }}
      >
        <div className="bg-grid-texture absolute inset-0 opacity-50" aria-hidden="true" />
        <div
          className="absolute -right-24 -top-24 h-80 w-80 rounded-full opacity-30 blur-3xl"
          style={{ background: editorial.accent }}
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-[1360px] px-4 py-12 sm:px-8 sm:py-16">
          <div className="mb-5 text-[13px] text-white/60">
            <Link href="/" className="hover:text-white">
              Home
            </Link>
            <span className="mx-1.5">/</span>
            <span className="text-white">{brand.name}</span>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white/85 backdrop-blur-sm">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: editorial.accent }}
              aria-hidden="true"
            />
            Brand store
          </span>
          <h1 className="font-display mt-4 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
            {editorial.headline}
          </h1>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-white/70">
            {editorial.blurb}
          </p>
          <p className="mt-6 text-[13px] font-semibold text-white/80">
            {total} {total === 1 ? "product" : "products"} in stock
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1360px] px-4 py-10 sm:px-8 sm:py-12">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2 text-sm text-neutral-500">
          <span>
            Showing <strong className="text-neutral-900">{total === 0 ? 0 : first}–{last}</strong>{" "}
            of <strong className="text-neutral-900">{total}</strong>
          </span>
          {totalPages > 1 && (
            <span>
              Page <strong className="text-neutral-900">{page}</strong> of {totalPages}
            </span>
          )}
        </div>

        {products.length === 0 ? (
          <p className="text-neutral-500">No {brand.name} products are published right now.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
              />
            ))}
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} hrefFor={hrefFor} />
      </div>
    </div>
  );
}
