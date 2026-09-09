import { notFound } from "next/navigation";
import { getCurrentUser } from "@/app/actions/account";
import { getCustomerOrder } from "@/lib/account";
import { formatNaira } from "@/lib/money";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return null;

  const order = await getCustomerOrder(user.id, id);
  if (!order) notFound();

  return (
    <div>
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-brand-900">
            {order.paystack_reference}
          </h1>
          <p className="text-sm text-neutral-500">
            Placed {new Date(order.created_at).toLocaleString()}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="mb-6 flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
        {order.order_items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-4 p-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{item.product_name_snapshot}</p>
              <p className="text-xs text-neutral-500">
                {formatNaira(item.unit_price_kobo_snapshot)} × {item.quantity}
              </p>
            </div>
            <p className="shrink-0 text-sm font-semibold">
              {formatNaira(item.unit_price_kobo_snapshot * item.quantity)}
            </p>
          </div>
        ))}
        <div className="flex items-center justify-between p-4">
          <span className="text-sm font-semibold text-brand-900">Total</span>
          <span className="text-sm font-semibold text-brand-900">
            {formatNaira(order.total_kobo)}
          </span>
        </div>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-4 text-sm text-neutral-600">
        <p className="mb-1 font-medium text-neutral-900">Delivery details</p>
        <p>{order.customer_name}</p>
        <p>{order.customer_email}</p>
        {order.customer_phone && <p>{order.customer_phone}</p>}
      </div>
    </div>
  );
}
