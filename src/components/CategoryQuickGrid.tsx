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
import type { CategoryWithCount } from "@/types/database";

function iconFor(name: string): LucideIcon {
  const n = name.toLowerCase();
  if (n.includes("camera") || n.includes("video")) return Camera;
  if (n.includes("light")) return Lightbulb;
  if (n.includes("audio") || n.includes("mic") || n.includes("sound")) return Headphones;
  if (n.includes("adapter") || n.includes("cable") || n.includes("power")) return Plug;
  if (n.includes("dock") || n.includes("storage") || n.includes("drive")) return HardDrive;
  return Package;
}

const TINTS = [
  { bg: "#EAF0FF", color: "#2F6FFF" },
  { bg: "#FFEEE7", color: "#FF6A3D" },
  { bg: "#F5E9FF", color: "#A855F7" },
  { bg: "#E3FBF0", color: "#16C784" },
  { bg: "#FFE8EC", color: "#FF3B5C" },
];

/** "Shop by category" grid matching the approved design-system mockup
 *  (Main.dc.html) — real categories, up to 8, sorted by product count. */
export function CategoryQuickGrid({ categories }: { categories: CategoryWithCount[] }) {
  const top = categories
    .filter((c) => c.product_count > 0)
    .sort((a, b) => b.product_count - a.product_count)
    .slice(0, 8);

  if (top.length === 0) return null;

  return (
    <section className="mx-auto max-w-[1360px] px-4 pb-2 pt-14 sm:px-8">
      <h2 className="font-display mb-5.5 text-2xl text-brand-900">Shop by category</h2>
      <div className="grid grid-cols-3 gap-3.5 sm:grid-cols-4 lg:grid-cols-8">
        {top.map((c, i) => {
          const Icon = iconFor(c.name);
          const tint = TINTS[i % TINTS.length];
          return (
            <Link
              key={c.id}
              href={`/category/${c.slug}`}
              className="flex flex-col items-center gap-2.5 rounded-2xl border border-neutral-200 bg-white p-5 text-center transition-all hover:-translate-y-1 hover:border-transparent hover:shadow-glow"
            >
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl"
                style={{ background: tint.bg }}
              >
                <Icon className="h-5 w-5" style={{ color: tint.color }} strokeWidth={1.8} />
              </div>
              <span className="text-xs font-semibold text-neutral-900">{c.name}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
