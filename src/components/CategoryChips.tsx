import Link from "next/link";
import type { CategoryWithCount } from "@/types/database";

/** Mobile-only horizontal category filter row. Split out from
 *  CategorySidebar deliberately — this needs to render as a full-width
 *  block ABOVE the sidebar+content flex row (not as a flex item inside
 *  it), because its -mx-4 "bleed to the viewport edge" trick only works
 *  correctly as a direct child of the padded page container. Nested
 *  inside a `flex` row alongside a much wider sibling, that negative
 *  margin was fighting the flex layout's width math instead. */
export function CategoryChips({ categories }: { categories: CategoryWithCount[] }) {
  if (categories.length === 0) return null;

  return (
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
  );
}
