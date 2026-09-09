import Link from "next/link";
import { getStaffSession } from "@/app/actions/staff-auth";
import { getDashboardStats } from "@/lib/staff";
import { hasAbility, STAFF_ABILITIES } from "@/lib/staff-auth";
import { formatNaira } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function StaffOverviewPage() {
  const session = await getStaffSession();
  if (!session) return null; // layout already redirects

  const stats = await getDashboardStats();
  const isSuper = session.role === "super_admin";

  const cards = [
    {
      label: "Published products",
      value: stats.productCount.toLocaleString(),
      href: "/staff/dashboard/products",
      show: isSuper || hasAbility(session, "manage_products") || hasAbility(session, "manage_inventory"),
    },
    {
      label: "Customers",
      value: stats.customerCount.toLocaleString(),
      href: "/staff/dashboard/customers",
      show: isSuper || hasAbility(session, "manage_customers"),
    },
    {
      label: "Orders",
      value: stats.orderCount.toLocaleString(),
      href: "/staff/dashboard/orders",
      show: isSuper || hasAbility(session, "manage_orders"),
    },
    {
      label: "Revenue (paid orders)",
      value: formatNaira(stats.revenueKobo),
      href: "/staff/dashboard/sales",
      show: isSuper || hasAbility(session, "view_sales"),
    },
  ].filter((c) => c.show);

  return (
    <div>
      <h1 className="font-display mb-1 text-2xl font-bold tracking-tight text-brand-900">
        Welcome, {session.fullName.split(" ")[0]}
      </h1>
      <p className="mb-6 text-sm text-neutral-500">
        {isSuper ? "Super admin — full access." : "Staff — access below is exactly what's been granted to you."}
      </p>

      {cards.length === 0 ? (
        <p className="rounded-lg border border-neutral-200 bg-white p-4 text-sm text-neutral-500">
          You haven&apos;t been granted access to any dashboard sections yet. Ask a super admin to
          assign you abilities from Team.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className="rounded-lg border border-neutral-200 bg-white p-4 transition-colors hover:border-brand-200"
            >
              <p className="font-display text-2xl font-bold text-brand-900">{card.value}</p>
              <p className="text-sm text-neutral-500">{card.label}</p>
            </Link>
          ))}
        </div>
      )}

      {!isSuper && (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">
            Your granted abilities
          </h2>
          <div className="flex flex-wrap gap-2">
            {STAFF_ABILITIES.filter((a) => hasAbility(session, a.key)).map((a) => (
              <span
                key={a.key}
                className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700"
              >
                {a.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
