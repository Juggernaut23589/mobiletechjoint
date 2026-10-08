import { notFound } from "next/navigation";
import { getCurrentUser } from "@/app/actions/account";
import { getCustomerOrder } from "@/lib/account";
import { formatNaira } from "@/lib/money";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";

const STEPS = [
  { key: "paid", label: "Order confirmed" },
  { key: "processing", label: "Processing" },
  { key: "packed", label: "Packed" },
  { key: "dispatched", label: "On its way" },
  { key: "delivered", label: "Delivered" },
] as const;

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
          <h1 className="text-xl font-bold tracking-tight text-white">
            {order.paystack_reference}
          </h1>
          <p className="text-sm text-white/50">
            Placed {new Date(order.created_at).toLocaleString()}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {(order.status === "paid" || order.status === "refunded") && (
        <div className="mb-6 rounded-lg border border-neutral-200 bg-white p-4 text-sm">
          <p className="mb-3 font-medium text-neutral-900">Delivery progress</p>
          {order.fulfillment_status === "cancelled" ? (
            <p className="text-neutral-600">This order was cancelled.</p>
          ) : order.fulfillment_status === "returned" ? (
            <p className="text-neutral-600">This order was returned.</p>
          ) : (
            <ol className="grid gap-3 sm:grid-cols-5">
              {STEPS.map((step, i) => {
                const reachedIndex = ["unfulfilled", "processing", "packed", "dispatched", "delivered"].indexOf(
                  order.fulfillment_status
                );
                const done = i <= reachedIndex;
                const at =
                  step.key === "paid"
                    ? order.paystack_verified_at
                    : order[`${step.key}_at` as "processing_at" | "packed_at" | "dispatched_at" | "delivered_at"];
                return (
                  <li key={step.key} className="flex items-start gap-2 sm:flex-col">
                    <span
                      className={`mt-0.5 h-3 w-3 shrink-0 rounded-full ${done ? "bg-green-600" : "bg-neutral-200"}`}
                    />
                    <span>
                      <span className={done ? "font-medium text-neutral-900" : "text-neutral-400"}>{step.label}</span>
                      {done && at && (
                        <span className="block text-xs text-neutral-400">{new Date(at).toLocaleDateString()}</span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
          {order.dispatch_method === "courier" && order.courier_name && (
            <p className="mt-3 text-xs text-neutral-600">
              Shipped with {order.courier_name}
              {order.tracking_number && <> · Tracking number: <strong>{order.tracking_number}</strong></>}
            </p>
          )}
          {order.dispatch_method === "rider" && (
            <p className="mt-3 text-xs text-neutral-600">Being delivered by our own rider.</p>
          )}
        </div>
      )}

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
        {order.discount_kobo > 0 && (
          <div className="flex items-center justify-between p-4 text-sm text-green-700">
            <span>Discount ({order.discount_code})</span>
            <span>−{formatNaira(order.discount_kobo)}</span>
          </div>
        )}
        <div className="flex items-center justify-between p-4">
          <span className="text-sm font-semibold text-brand-900">Total</span>
          <span className="text-sm font-semibold text-brand-900">
            {formatNaira(order.total_kobo)}
          </span>
        </div>
        {order.refunded_kobo > 0 && (
          <div className="flex items-center justify-between p-4 text-sm">
            <span className="text-neutral-600">Refunded to you</span>
            <span className="font-semibold text-neutral-900">{formatNaira(order.refunded_kobo)}</span>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-4 text-sm text-neutral-600">
        <p className="mb-1 font-medium text-neutral-900">Delivery details</p>
        <p>{order.customer_name}</p>
        <p>{order.customer_email}</p>
        {order.customer_phone && <p>{order.customer_phone}</p>}
        {order.delivery_address && (
          <p className="mt-2">
            {order.delivery_address}, {order.delivery_lga}, {order.delivery_state}
          </p>
        )}
        {order.delivery_fee_kobo > 0 && (
          <p className="mt-1 text-xs text-neutral-400">
            Delivery fee: {formatNaira(order.delivery_fee_kobo)}
          </p>
        )}
      </div>
    </div>
  );
}
