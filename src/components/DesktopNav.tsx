import Link from "next/link";

/** Static Deals/Blog links in the desktop navbar. The top-by-product-count
 *  category links (Lighting, Lenses, Audio, Cameras, Storage) were removed
 *  at the business's request to make more room for a wider search bar, and
 *  deliberately not backfilled with other categories — CategoriesMenu's
 *  dropdown and the footer still link to every category. */
export function DesktopNav() {
  return (
    <nav className="hidden shrink-0 items-center gap-5 lg:flex">
      <Link href="/deals" className="text-base font-medium text-accent-500 transition-colors hover:text-white">
        Deals
      </Link>
      <Link href="/blog" className="text-base font-medium text-[#C7CCDA] transition-colors hover:text-white">
        Blog
      </Link>
    </nav>
  );
}
