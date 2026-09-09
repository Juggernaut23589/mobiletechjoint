import Link from "next/link";
import { redirect } from "next/navigation";
import { getStaffSession } from "@/app/actions/staff-auth";
import { hasAbility } from "@/lib/staff-auth";
import { getAllOrders } from "@/lib/staff";
import { formatNaira } from "@/lib/money";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";

export const dynamic = "force-dynamic";

export default async function StaffOrdersPage() {
  const session = await getStaffSession();
  if (!session || (session.role !== "super_admin" && !hasAbility(session, "manage_orders"))) {
    redirect("/staff/dashboard?error=forbidden");
  }

  const orders = await getAllOrders();

  return (
    <div>
      <h1 className="font-display mb-1 text-2xl font-bold tracking-tight text-brand-900">Orders</h1>
      <p className="mb-6 text-sm text-neutral-500">{orders.length} most recent orders.</p>

      {orders.length === 0 ? (
        <p className="text-sm text-neutral-500">No orders yet.</p>
      ) : (
        <div className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/staff/dashboard/orders/${order.id}`}
              className="flex flex-wrap items-center justify-between gap-2 p-4 hover:bg-neutral-50"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {order.customer_name} · {order.customer_email}
                </p>
                <p className="text-xs text-neutral-500">
                  {order.paystack_reference} · {new Date(order.created_at).toLocaleString()}
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
  );
}
