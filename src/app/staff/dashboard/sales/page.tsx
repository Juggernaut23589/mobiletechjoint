import { redirect } from "next/navigation";
import { getStaffSession } from "@/app/actions/staff-auth";
import { hasAbility } from "@/lib/staff-auth";
import { getSalesStats } from "@/lib/staff";
import { formatNaira } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function StaffSalesPage() {
  const session = await getStaffSession();
  if (!session || (session.role !== "super_admin" && !hasAbility(session, "view_sales"))) {
    redirect("/staff/dashboard?error=forbidden");
  }

  const stats = await getSalesStats();
  const maxDaily = Math.max(...stats.dailyRevenue.map((d) => d.revenueKobo), 1);

  return (
    <div>
      <h1 className="font-display mb-1 text-2xl font-bold tracking-tight text-brand-900">
        Sales &amp; Income
      </h1>
      <p className="mb-6 text-sm text-neutral-500">Based on paid orders only.</p>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="font-display text-2xl font-bold text-brand-900">
            {formatNaira(stats.revenueKobo)}
          </p>
          <p className="text-sm text-neutral-500">Total revenue</p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="font-display text-2xl font-bold text-brand-900">{stats.paidOrderCount}</p>
          <p className="text-sm text-neutral-500">Paid orders</p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="font-display text-2xl font-bold text-brand-900">
            {formatNaira(stats.averageOrderKobo)}
          </p>
          <p className="text-sm text-neutral-500">Average order value</p>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">
          Revenue by day (last {stats.dailyRevenue.length})
        </h2>
        {stats.dailyRevenue.length === 0 ? (
          <p className="text-sm text-neutral-500">No paid orders yet.</p>
        ) : (
          <div className="flex flex-col gap-2 rounded-lg border border-neutral-200 bg-white p-4">
            {stats.dailyRevenue.map((day) => (
              <div key={day.date} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-xs text-neutral-500">{day.date}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className="h-full bg-brand-gradient"
                    style={{ width: `${Math.max((day.revenueKobo / maxDaily) * 100, 3)}%` }}
                  />
                </div>
                <span className="w-24 shrink-0 text-right text-xs font-medium">
                  {formatNaira(day.revenueKobo)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">
          Top-selling products
        </h2>
        {stats.topProducts.length === 0 ? (
          <p className="text-sm text-neutral-500">No paid orders yet.</p>
        ) : (
          <div className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
            {stats.topProducts.map((product) => (
              <div key={product.name} className="flex items-center justify-between gap-4 p-3">
                <p className="min-w-0 truncate text-sm">{product.name}</p>
                <div className="flex shrink-0 items-center gap-4 text-sm">
                  <span className="text-neutral-500">{product.quantitySold} sold</span>
                  <span className="font-semibold">{formatNaira(product.revenueKobo)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
