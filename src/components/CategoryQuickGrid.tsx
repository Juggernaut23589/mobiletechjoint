import Link from "next/link";
import {
  Camera,
  Lightbulb,
  Headphones,
  Plug,
  HardDrive,
  Package,
  Drone,
  type LucideIcon,
} from "lucide-react";
import type { CategoryWithCount } from "@/types/database";

function iconFor(name: string): LucideIcon {
  const n = name.toLowerCase();
  if (n.includes("drone")) return Drone;
  if (n.includes("camera") || n.includes("video")) return Camera;
  if (n.includes("light")) return Lightbulb;
  if (n.includes("audio") || n.includes("mic") || n.includes("sound")) return Headphones;
  if (n.includes("adapter") || n.includes("cable") || n.includes("power")) return Plug;
  if (n.includes("dock") || n.includes("storage") || n.includes("drive")) return HardDrive;
  return Package;
}

/** "Shop by category" row — flat, uniform outlined icon tiles with a
 *  centered label underneath (matching camerajoint.ng's reference layout),
 *  real categories, sorted by product count, with Drones always pinned in
 *  even though its count alone wouldn't put it in the natural top 8. */
export function CategoryQuickGrid({ categories }: { categories: CategoryWithCount[] }) {
  const withStock = categories.filter((c) => c.product_count > 0);
  const bySize = [...withStock].sort((a, b) => b.product_count - a.product_count);

  const top = bySize.slice(0, 7);
  const drones = withStock.find((c) => c.slug === "drones");
  if (drones && !top.some((c) => c.id === drones.id)) {
    top.push(drones);
  } else if (!drones) {
    top.push(...bySize.slice(7, 8));
  }

  if (top.length === 0) return null;

  return (
    <section className="mx-auto max-w-[1360px] px-4 pb-2 pt-14 text-center sm:px-8">
      <h2 className="font-display mb-5.5 text-2xl text-white">Shop by category</h2>
      <div className="flex flex-wrap justify-center gap-x-7 gap-y-6">
        {top.map((c) => {
          const Icon = iconFor(c.name);
          return (
            <Link
              key={c.id}
              href={`/category/${c.slug}`}
              className="group flex w-[92px] flex-col items-center gap-2 text-center"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/15 bg-white/[0.03] transition-colors group-hover:border-accent-500">
                <Icon className="h-5.5 w-5.5 text-accent-400" strokeWidth={1.6} />
              </div>
              <span className="text-[11px] font-bold uppercase leading-tight tracking-wide text-white/80">
                {c.name}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
