import Link from "next/link";
import { getStaffSession } from "@/app/actions/staff-auth";
import { getAttentionCounts, getDashboardStats } from "@/lib/staff";
import { hasAbility, STAFF_ABILITIES } from "@/lib/staff-auth";
import { formatNaira } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function StaffOverviewPage() {
  const session = await getStaffSession();
  if (!session) return null; // layout already redirects

  const [stats, attention] = await Promise.all([getDashboardStats(), getAttentionCounts()]);
  const isSuper = session.role === "super_admin";
  const canSeeOrders = hasAbility(session, "manage_orders") || hasAbility(session, "manage_deliveries");

  const todo = [
    { label: "Orders to fulfil", count: attention.toFulfil, href: "/staff/dashboard/orders?view=to_fulfil", show: canSeeOrders },
    { label: "Out for delivery", count: attention.outForDelivery, href: "/staff/dashboard/orders?view=out_for_delivery", show: canSeeOrders },
    { label: "Refunds awaiting approval", count: attention.refundsAwaitingApproval, href: "/staff/dashboard/orders?view=refund_approval", show: hasAbility(session, "manage_orders") },
    { label: "Low stock", count: attention.lowStock, href: "/staff/dashboard/inventory?stock=low", show: hasAbility(session, "manage_inventory") },
    { label: "Out of stock (still listed)", count: attention.outOfStock, href: "/staff/dashboard/inventory?stock=out", show: hasAbility(session, "manage_inventory") },
    { label: "Staff awaiting approval", count: attention.pendingStaff, href: "/staff/dashboard/team", show: isSuper },
    { label: "Expenses awaiting approval", count: attention.expensesAwaitingApproval, href: "/staff/dashboard/expenses?period=all", show: isSuper },
    { label: "Purchase orders awaiting delivery", count: attention.purchaseOrdersAwaitingDelivery, href: "/staff/dashboard/purchase-orders?status=ordered", show: hasAbility(session, "manage_purchasing") },
  ].filter((t) => t.show);

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
      label: "Net revenue (all time)",
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

      {todo.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">
            Needs attention
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {todo.map((t) => (
              <Link
                key={t.label}
                href={t.href}
                className={`flex items-center justify-between rounded-lg border p-4 transition-colors ${
                  t.count > 0
                    ? "border-amber-200 bg-amber-50 hover:border-amber-300"
                    : "border-neutral-200 bg-white hover:border-brand-200"
                }`}
              >
                <span className="text-sm text-neutral-700">{t.label}</span>
                <span className={`font-display text-xl font-bold ${t.count > 0 ? "text-amber-700" : "text-neutral-300"}`}>
                  {t.count.toLocaleString()}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

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
