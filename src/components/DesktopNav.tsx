"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { CategoryWithCount } from "@/types/database";

/** Shortened labels for the navbar only — category pages, the footer, and
 *  the homepage category grid keep the full descriptive name. */
const NAV_LABEL_OVERRIDES: Record<string, string> = {
  "Rigs & Accessories": "Rigs",
  "Lenses & Filters": "Lenses",
};

/** Top-category nav links in the desktop navbar. Fetched client-side via
 *  /api/categories rather than server-rendered in SiteHeader — SiteHeader
 *  lives in the root layout on every page, so a data fetch there would
 *  force the whole app out of static rendering (see /api/categories'
 *  own comment; same tradeoff AccountLink and MobileCategoryMenu already
 *  make). Shows real categories, highest product count first, instead of
 *  a hardcoded list that could point at a category that doesn't exist. */
export function DesktopNav() {
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data: { categories?: CategoryWithCount[] }) => {
        const top = (data.categories ?? [])
          .filter((c) => c.product_count > 0)
          .sort((a, b) => b.product_count - a.product_count)
          .slice(0, 5);
        setCategories(top);
      })
      .catch(() => {});
  }, []);

  if (categories.length === 0) return <div className="hidden flex-1 lg:block" />;

  return (
    <nav className="hidden flex-1 items-center justify-center gap-5 lg:flex">
      {categories.map((c) => (
        <Link
          key={c.id}
          href={`/category/${c.slug}`}
          className="text-sm font-medium text-[#C7CCDA] transition-colors hover:text-white"
        >
          {NAV_LABEL_OVERRIDES[c.name] ?? c.name}
        </Link>
      ))}
      <Link href="/deals" className="text-sm font-medium text-accent-500 hover:text-accent-400">
        Deals
      </Link>
    </nav>
  );
}
