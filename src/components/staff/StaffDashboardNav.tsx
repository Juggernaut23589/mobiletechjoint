"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface StaffNavItem {
  href: string;
  label: string;
}

/** Sidebar nav links matching the approved design-system mockup
 *  (AdminDashboard.dc.html) — a client component (usePathname) for the
 *  active-tab left-border highlight. The visible item list (ability-
 *  filtered) is computed server-side in the layout and passed in as
 *  props, since that filtering depends on the staff session. */
export function StaffDashboardNav({ items }: { items: StaffNavItem[] }) {
  const pathname = usePathname();

  return (
    <>
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`block border-l-2 px-5 py-2.5 text-[13px] font-semibold transition-colors ${
              active
                ? "border-brand-500 bg-brand-500/10 text-white"
                : "border-transparent text-[#8A91A5] hover:text-white"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );
}
