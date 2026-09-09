import Link from "next/link";
import { getCurrentUser } from "@/app/actions/account";
import { getCustomerProfile, getCustomerOrders } from "@/lib/account";
import { formatNaira } from "@/lib/money";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";

export const dynamic = "force-dynamic";

export default async function AccountOverviewPage() {
  const user = await getCurrentUser();
  if (!user) return null; // proxy.ts already redirects; this satisfies TS.

  const [profile, orders] = await Promise.all([
    getCustomerProfile(user.id),
    getCustomerOrders(user.id),
  ]);

  const recentOrders = orders.slice(0, 3);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-brand-900">
        Hi{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
      </h1>
      <p className="mb-6 text-sm text-neutral-500">{user.email}</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-2xl font-bold text-brand-900">{orders.length}</p>
          <p className="text-sm text-neutral-500">Total orders</p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-2xl font-bold text-brand-900">
            {formatNaira(orders.reduce((sum, o) => sum + (o.status === "paid" ? o.total_kobo : 0), 0))}
          </p>
          <p className="text-sm text-neutral-500">Total spent</p>
        </div>
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
            Recent Orders
          </h2>
          {orders.length > 0 && (
            <Link href="/account/orders" className="text-sm font-medium text-brand-600 hover:underline">
              View all
            </Link>
          )}
        </div>

        {recentOrders.length === 0 ? (
          <p className="text-sm text-neutral-500">
            No orders yet.{" "}
            <Link href="/" className="font-medium text-brand-600 hover:underline">
              Start shopping
            </Link>
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/account/orders/${order.id}`}
                className="flex flex-col gap-1 p-4 hover:bg-neutral-50 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium">{order.paystack_reference}</p>
                  <p className="text-xs text-neutral-500">
                    {new Date(order.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold">{formatNaira(order.total_kobo)}</span>
                  <OrderStatusBadge status={order.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
