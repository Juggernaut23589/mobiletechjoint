import Link from "next/link";
import {
  Camera,
  Lightbulb,
  Headphones,
  Plug,
  HardDrive,
  Package,
  type LucideIcon,
} from "lucide-react";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import type { CategoryWithCount } from "@/types/database";

/** Keyword-matched, not a real per-category icon library — there's no
 *  custom marketing artwork for categories the way Konga has photo
 *  banners, so this picks a reasonable icon by name and falls back to a
 *  generic package icon rather than guessing wrong. */
function iconFor(name: string): LucideIcon {
  const n = name.toLowerCase();
  if (n.includes("camera") || n.includes("video")) return Camera;
  if (n.includes("light")) return Lightbulb;
  if (n.includes("audio") || n.includes("mic") || n.includes("sound")) return Headphones;
  if (n.includes("adapter") || n.includes("cable") || n.includes("power")) return Plug;
  if (n.includes("dock") || n.includes("storage") || n.includes("drive")) return HardDrive;
  return Package;
}

export function CategoryTiles({ categories }: { categories: CategoryWithCount[] }) {
  const withProducts = categories.filter((c) => c.product_count > 0);
  if (withProducts.length === 0) return null;

  return (
    <RevealOnScroll>
      <div className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-7xl gap-3 overflow-x-auto px-4 py-5">
          {withProducts.map((category) => {
            const Icon = iconFor(category.name);
            return (
              <Link
                key={category.id}
                href={`/category/${category.slug}`}
                className="flex w-24 shrink-0 flex-col items-center gap-2 rounded-xl p-2 text-center transition-colors hover:bg-brand-50"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-merch-gradient text-white">
                  <Icon className="h-6 w-6" strokeWidth={1.75} />
                </div>
                <span className="line-clamp-2 text-xs font-medium text-neutral-700">
                  {category.name}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </RevealOnScroll>
  );
}
