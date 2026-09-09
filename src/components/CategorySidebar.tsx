import Link from "next/link";
import type { CategoryWithCount } from "@/types/database";

/** Desktop: sticky left sidebar. Mobile: horizontal scrollable chip row
 *  (rendered by the same component, switched with Tailwind breakpoints, so
 *  there's one source of truth for the category list). */
export function CategorySidebar({ categories }: { categories: CategoryWithCount[] }) {
  if (categories.length === 0) return null;

  return (
    <>
      <nav className="hidden md:sticky md:top-24 md:block md:h-fit md:w-56 md:shrink-0">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Categories
        </h2>
        <ul className="flex flex-col gap-1">
          {categories.map((c) => (
            <li key={c.id}>
              <Link
                href={`/category/${c.slug}`}
                className="group flex items-center justify-between rounded-lg px-3 py-2 text-sm text-neutral-700 transition-colors hover:bg-brand-50 hover:text-brand-700"
              >
                <span>{c.name}</span>
                <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-400 group-hover:bg-brand-100 group-hover:text-brand-600">
                  {c.product_count}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <nav className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 md:hidden">
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/category/${c.slug}`}
            className="shrink-0 rounded-full border border-neutral-200 bg-white px-4 py-1.5 text-sm font-medium text-neutral-700 whitespace-nowrap transition-colors hover:border-brand-200 hover:text-brand-700"
          >
            {c.name}
          </Link>
        ))}
      </nav>
    </>
  );
}
