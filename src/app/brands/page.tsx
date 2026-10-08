import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getBrandsWithCounts } from "@/lib/products";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "All Brands",
  description: "Every manufacturer we stock, from Sony to the smallest accessory makers.",
};

export default async function BrandsPage() {
  const brands = (await getBrandsWithCounts())
    .filter((b) => b.product_count > 0)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-12 sm:px-8 sm:py-16">
      <div className="mb-5 text-[13px] text-white/50">
        <Link href="/" className="text-accent-400 hover:text-white">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-white">All Brands</span>
      </div>
      <h1 className="font-display mb-2 text-3xl font-bold tracking-tight text-white">
        All Brands
      </h1>
      <p className="mb-10 max-w-xl text-sm text-white/50">
        {brands.length} manufacturers, straight from the source — never grey market.
      </p>

      {brands.length === 0 ? (
        <p className="text-white/50">No brands are published right now.</p>
      ) : (
        <div className="flex flex-wrap gap-2.5">
          {brands.map((b) => (
            <Link
              key={b.id}
              href={`/brand/${b.slug}`}
              className="group inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.03] px-4 py-2.5 text-[13.5px] font-semibold text-white/80 transition-all hover:-translate-y-0.5 hover:border-accent-500 hover:bg-accent-500/10 hover:text-accent-400"
            >
              {b.name}
              <span className="text-white/35 group-hover:text-accent-400/70">
                ({b.product_count})
              </span>
              <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
