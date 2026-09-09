import { notFound, redirect } from "next/navigation";
import { getStaffSession } from "@/app/actions/staff-auth";
import { hasAbility } from "@/lib/staff-auth";
import { getOrderById } from "@/lib/staff";
import { formatNaira } from "@/lib/money";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { OrderStatusForm } from "@/components/staff/OrderStatusForm";

export const dynamic = "force-dynamic";

export default async function StaffOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getStaffSession();
  if (!session || (session.role !== "super_admin" && !hasAbility(session, "manage_orders"))) {
    redirect("/staff/dashboard?error=forbidden");
  }

  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) notFound();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight text-brand-900">
            {order.paystack_reference}
          </h1>
          <p className="text-sm text-neutral-500">
            Placed {new Date(order.created_at).toLocaleString()}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-neutral-200 bg-white p-4 text-sm">
          <p className="mb-1 font-medium text-neutral-900">Customer</p>
          <p>{order.customer_name}</p>
          <p>{order.customer_email}</p>
          {order.customer_phone && <p>{order.customer_phone}</p>}
          <p className="mt-1 text-xs text-neutral-400">
            {order.customer_id ? "Registered account" : "Guest checkout"}
          </p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4 text-sm">
          <p className="mb-1 font-medium text-neutral-900">Update status</p>
          <p className="mb-2 text-xs text-neutral-500">
            "Paid" is only ever set automatically by Paystack settlement — staff can mark an
            order failed or refunded (e.g. after an offline refund).
          </p>
          <OrderStatusForm orderId={order.id} currentStatus={order.status} />
        </div>
      </div>

      <div className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
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
    </div>
  );
}
