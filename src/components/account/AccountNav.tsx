"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/account", label: "Overview" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/payment-methods", label: "Payment Methods" },
];

/** Sidebar nav matching the approved design-system mockup (Account.dc.html)
 *  — a client component (usePathname) so the active-tab highlight works,
 *  wrapped by the server-rendered AccountLayout which fetches the real
 *  profile info shown above it. */
export function AccountNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-2 overflow-x-auto md:w-[220px] md:shrink-0 md:flex-col md:overflow-visible">
      {NAV.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`shrink-0 rounded-[10px] px-3.5 py-2.5 text-[13.5px] font-semibold transition-colors ${
              active ? "bg-brand-50 text-brand-700" : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
