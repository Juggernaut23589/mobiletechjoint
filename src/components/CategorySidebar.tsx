import Link from "next/link";
import type { CategoryWithCount } from "@/types/database";

/** Desktop-only sticky sidebar. Deliberately does NOT also render the
 *  mobile chip row anymore — see CategoryChips.tsx for why they were
 *  split apart (the mobile row needs to be a full-width block above the
 *  sidebar+content flex row, not a flex item inside it). */
export function CategorySidebar({ categories }: { categories: CategoryWithCount[] }) {
  if (categories.length === 0) return null;

  return (
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
  );
}
