import { notFound, redirect } from "next/navigation";
import { getStaffSession } from "@/app/actions/staff-auth";
import { hasAbility } from "@/lib/staff-auth";
import { getOrderById } from "@/lib/staff";
import { createServiceClient } from "@/lib/supabase/server";
import { formatNaira } from "@/lib/money";
import { REFUND_APPROVAL_LIMIT_KOBO } from "@/lib/refunds";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { EmailCustomerForm } from "@/components/staff/EmailCustomerForm";
import { OrderFulfillmentPanel } from "@/components/staff/OrderFulfillmentPanel";
import { OrderRefundsPanel } from "@/components/staff/OrderRefundsPanel";
import { ActivityList, type ActivityRow } from "@/components/staff/ActivityList";
import type { Refund } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function StaffOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getStaffSession();
  const canManageOrders = hasAbility(session, "manage_orders");
  if (!session || (!canManageOrders && !hasAbility(session, "manage_deliveries"))) {
    redirect("/staff/dashboard?error=forbidden");
  }

  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) notFound();

  const supabase = createServiceClient();
  const [{ data: refunds }, { data: timeline }, { data: staff }] = await Promise.all([
    supabase.from("refunds").select("*").eq("order_id", id).order("created_at", { ascending: false }),
    supabase
      .from("staff_activity_log")
      .select("id, staff_name, action, entity_type, entity_id, summary, changes, created_at")
      .eq("entity_type", "order")
      .eq("entity_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("staff_profiles").select("id, full_name").eq("is_active", true).order("full_name"),
  ]);

  const refundList = (refunds ?? []) as Refund[];
  const pendingKobo = refundList
    .filter((r) => r.status === "pending_approval")
    .reduce((sum, r) => sum + r.amount_kobo, 0);
  const refundableKobo =
    order.status === "paid" ? Math.max(order.total_kobo - order.refunded_kobo - pendingKobo, 0) : 0;
  const riderName = staff?.find((s) => s.id === order.rider_staff_id)?.full_name ?? null;
  const canFulfil = order.status === "paid" || order.status === "refunded";

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight text-brand-900">
            {order.paystack_reference}
          </h1>
          <p className="text-sm text-neutral-500">
            Placed {new Date(order.created_at).toLocaleString()}
            {order.paystack_verified_at && ` · Paid ${new Date(order.paystack_verified_at).toLocaleString()}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500">Payment</span>
          <OrderStatusBadge status={order.status} />
        </div>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-neutral-200 bg-white p-4 text-sm">
          <p className="mb-1 font-medium text-neutral-900">Customer</p>
          <p>{order.customer_name}</p>
          <p>{order.customer_email}</p>
          {order.customer_phone && <p>{order.customer_phone}</p>}
          {order.delivery_address && (
            <p className="mt-2">
              {order.delivery_address}, {order.delivery_lga}, {order.delivery_state}
              {order.delivery_fee_kobo > 0 && (
                <span className="text-neutral-400"> · delivery {formatNaira(order.delivery_fee_kobo)}</span>
              )}
            </p>
          )}
          {hasAbility(session, "manage_disputes") && (
            <div className="mt-3">
              <EmailCustomerForm customerEmail={order.customer_email} orderReference={order.paystack_reference} />
            </div>
          )}
        </div>

        <OrderFulfillmentPanel
          orderId={order.id}
          status={order.fulfillment_status}
          canFulfil={canFulfil}
          dispatch={{
            method: order.dispatch_method,
            riderName,
            courierName: order.courier_name,
            trackingNumber: order.tracking_number,
          }}
          timestamps={[
            { label: "Processing", at: order.processing_at },
            { label: "Packed", at: order.packed_at },
            { label: "Dispatched", at: order.dispatched_at },
            { label: "Delivered", at: order.delivered_at },
            { label: "Cancelled", at: order.cancelled_at },
            { label: "Returned", at: order.returned_at },
          ]}
          riders={(staff ?? []).map((s) => ({ id: s.id, name: s.full_name }))}
        />

        {canManageOrders && (
          <OrderRefundsPanel
            orderId={order.id}
            refunds={refundList}
            refundableKobo={refundableKobo}
            approvalLimitKobo={REFUND_APPROVAL_LIMIT_KOBO}
            canRefund={order.status === "paid"}
            isSuperAdmin={session.role === "super_admin"}
            items={order.order_items
              .filter((i) => i.product_id)
              .map((i) => ({ productId: i.product_id!, name: i.product_name_snapshot, quantity: i.quantity }))}
          />
        )}
      </div>

      <div className="mb-8 flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
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
          <span className="text-sm font-semibold text-brand-900">{formatNaira(order.total_kobo)}</span>
        </div>
        {order.refunded_kobo > 0 && (
          <div className="flex items-center justify-between px-4 pb-4 text-sm">
            <span className="text-red-600">Refunded</span>
            <span className="text-red-600">−{formatNaira(order.refunded_kobo)}</span>
          </div>
        )}
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">Timeline</h2>
      <ActivityList rows={(timeline ?? []) as ActivityRow[]} emptyText="No staff actions on this order yet." />
    </div>
  );
}
