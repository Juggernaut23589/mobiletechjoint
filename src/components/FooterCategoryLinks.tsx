"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { CategoryWithCount } from "@/types/database";

/** Real category links for the footer's "Shop" column. Client-side fetch
 *  for the same reason DesktopNav is — SiteFooter is in the root layout,
 *  so a server-side fetch there would force the whole app dynamic. */
export function FooterCategoryLinks() {
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

  if (categories.length === 0) return null;

  return (
    <div className="flex flex-col gap-2.5 text-sm">
      {categories.map((c) => (
        <Link key={c.id} href={`/category/${c.slug}`} className="text-white/60 hover:text-white">
          {c.name}
        </Link>
      ))}
    </div>
  );
}
