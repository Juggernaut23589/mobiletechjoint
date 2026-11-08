import Link from "next/link";
import { CategoriesMenu } from "@/components/CategoriesMenu";

/** Secondary nav row under the main header, in the Amazon-style "All ·
 *  Today's Deals · Customer Service · ..." pattern the business asked to
 *  match: a flat row of links on its own strip, separate from the search
 *  row above it. Houses the "Categories" mega-menu trigger plus the five
 *  highest-traffic category shortcuts and the links DesktopNav used to
 *  carry (Deals, Blog) — moving all of it off the main row is what gives
 *  the search bar the rest of that row's width. */
const QUICK_LINKS = [
  { href: "/category/lighting", label: "Lighting" },
  { href: "/category/microphones-and-audio", label: "Audio" },
  { href: "/category/tripods-and-mounts", label: "Mounts" },
  { href: "/category/cameras", label: "Cameras" },
  { href: "/category/drones", label: "Drones" },
];

export function CategoryBar() {
  return (
    <div className="hidden border-t border-white/10 bg-brand-900 lg:block">
      <div className="mx-auto flex max-w-[1440px] items-center gap-6 px-4 py-2.5">
        <CategoriesMenu />
        {QUICK_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-sm font-medium text-[#C7CCDA] transition-colors hover:text-white"
          >
            {link.label}
          </Link>
        ))}
        <Link
          href="/deals"
          className="text-sm font-medium text-accent-500 transition-colors hover:text-white"
        >
          Deals
        </Link>
        <Link
          href="/blog"
          className="text-sm font-medium text-[#C7CCDA] transition-colors hover:text-white"
        >
          Blog
        </Link>
      </div>
    </div>
  );
}
