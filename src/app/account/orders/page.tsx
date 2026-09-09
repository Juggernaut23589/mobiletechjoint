import Link from "next/link";
import { getCurrentUser } from "@/app/actions/account";
import { getCustomerOrders } from "@/lib/account";
import { formatNaira } from "@/lib/money";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const orders = await getCustomerOrders(user.id);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-brand-900">Your Orders</h1>

      {orders.length === 0 ? (
        <p className="text-sm text-neutral-500">
          No orders yet.{" "}
          <Link href="/" className="font-medium text-brand-600 hover:underline">
            Start shopping
          </Link>
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/account/orders/${order.id}`}
              className="flex flex-col gap-2 p-4 hover:bg-neutral-50 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-medium">{order.paystack_reference}</p>
                <p className="text-xs text-neutral-500">
                  {new Date(order.created_at).toLocaleDateString()} ·{" "}
                  {order.order_items.length} item{order.order_items.length === 1 ? "" : "s"}
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
