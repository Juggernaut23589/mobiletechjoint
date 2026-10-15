"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CategoryWithCount } from "@/types/database";

/** Always-visible desktop counterpart to MobileCategoryMenu's drawer — same
 *  full category list (no counts, no "Uncategorized" — see
 *  getCategoriesWithCounts), but as a persistent left-hand column instead
 *  of a hidden-until-tapped menu, per the business's request. Collapsible
 *  (saves width for shoppers who don't need it) and scrollable so a long
 *  category list never pushes other content below the fold. Desktop-only
 *  (lg:) — MobileCategoryMenu already covers small screens.
 *
 *  Standalone (default) owns its own width/sticky/responsive-hide, for
 *  pages where it's the only sidebar (homepage, search). `embedded` drops
 *  all of that so the category page can stack it above CategoryFilters
 *  inside one shared sticky/scroll column instead of two separate ones. */
export function CategorySidebar({ embedded = false }: { embedded?: boolean }) {
  const pathname = usePathname();
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data: { categories?: CategoryWithCount[] }) => {
        setCategories(data.categories ?? []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  if (collapsed) {
    return (
      <div className={embedded ? "shrink-0" : "hidden shrink-0 lg:sticky lg:top-[88px] lg:block lg:self-start"}>
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          aria-label="Show categories"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink/15 text-ink/60 transition-colors hover:border-accent-500 hover:text-ink"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={
        embedded
          ? "shrink-0"
          : "hidden w-[240px] shrink-0 lg:sticky lg:top-[88px] lg:block lg:max-h-[calc(100vh-112px)] lg:self-start lg:overflow-y-auto"
      }
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[13px] font-bold uppercase tracking-wide text-ink/70">Categories</h2>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          aria-label="Hide categories"
          className="-m-1.5 p-1.5 text-ink/40 transition-colors hover:text-ink"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {!loaded ? (
        <p className="text-sm text-ink/50">Loading…</p>
      ) : categories.length === 0 ? (
        <p className="text-sm text-ink/50">No categories yet.</p>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {categories.map((c) => {
            const href = `/category/${c.slug}`;
            const active = pathname === href;
            return (
              <li key={c.id}>
                <Link
                  href={href}
                  className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                    active
                      ? "bg-accent-500/15 font-semibold text-link"
                      : "text-ink/75 hover:bg-ink/5 hover:text-ink"
                  }`}
                >
                  {c.name}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
