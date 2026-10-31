"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CategoryWithCount } from "@/types/database";

/** Horizontal counterpart to CategorySidebar for the homepage — a
 *  scrollable row of category pills above the product sections, instead
 *  of a persistent left column. Replaced the sidebar placement there per
 *  the business's updated request; CategorySidebar itself is unchanged
 *  and still used on /category and /search, where a left-hand list next
 *  to filters still makes sense. */
export function CategoryTopBar() {
  const pathname = usePathname();
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data: { categories?: CategoryWithCount[] }) => {
        setCategories(data.categories ?? []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  if (loaded && categories.length === 0) return null;

  return (
    <div className="mx-auto max-w-[1360px] px-4 pt-6 sm:px-8">
      <h2 className="mb-2.5 text-[13px] font-bold uppercase tracking-wide text-ink/70">
        Categories
      </h2>
      <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
        {!loaded
          ? Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-9 w-24 shrink-0 animate-pulse rounded-full bg-ink/5" />
            ))
          : categories.map((c) => {
              const href = `/category/${c.slug}`;
              const active = pathname === href;
              return (
                <Link
                  key={c.id}
                  href={href}
                  className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "border-accent-500 bg-accent-500/15 font-semibold text-link"
                      : "border-ink/15 text-ink/75 hover:border-accent-500/50 hover:text-ink"
                  }`}
                >
                  {c.name}
                </Link>
              );
            })}
      </div>
    </div>
  );
}
