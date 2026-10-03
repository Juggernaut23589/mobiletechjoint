"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAnyStaffAbility } from "@/lib/staff-session";
import { logStaffActivity } from "@/lib/activity-log";
import { changeStock } from "@/lib/stock";
import { canMoveTo, FULFILLMENT_LABELS } from "@/lib/fulfillment";
import { sendOrderDeliveredEmail, sendOrderDispatchedEmail } from "@/lib/order-emails";
import type { StaffSession } from "@/lib/staff-auth";
import type { FulfillmentStatus } from "@/types/database";

type Result = { error?: string; notice?: string };

const TIMESTAMP_COLUMN: Partial<Record<FulfillmentStatus, string>> = {
  processing: "processing_at",
  packed: "packed_at",
  dispatched: "dispatched_at",
  delivered: "delivered_at",
  cancelled: "cancelled_at",
  returned: "returned_at",
};

/** Moves an order along processing → packed → dispatched → delivered, or
 *  cancels / marks it returned. Payment state (orders.status) is never
 *  touched here — refunds are a separate, explicit step. */
export async function updateFulfillment(_prev: Result, formData: FormData): Promise<Result> {
  let actor: StaffSession;
  try {
    actor = await requireAnyStaffAbility(["manage_orders", "manage_deliveries"]);
  } catch {
    return { error: "Forbidden." };
  }

  const orderId = formData.get("orderId") as string;
  const to = formData.get("to") as FulfillmentStatus;
  const restock = formData.get("restock") === "on";
  const notify = formData.get("notify") !== "off";
  const note = String(formData.get("note") ?? "").trim();
  if (!orderId || !(to in FULFILLMENT_LABELS)) return { error: "Invalid request." };

  const supabase = createServiceClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id, status, fulfillment_status, customer_name, customer_email, paystack_reference, order_items(product_id, product_name_snapshot, quantity)")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { error: "Order not found." };
  if (order.status !== "paid" && order.status !== "refunded") {
    return { error: "Only paid orders can be fulfilled." };
  }
  const from = order.fulfillment_status as FulfillmentStatus;
  if (!canMoveTo(from, to)) {
    return { error: `Can't move an order from ${FULFILLMENT_LABELS[from]} to ${FULFILLMENT_LABELS[to]}.` };
  }

  const update: Record<string, unknown> = { fulfillment_status: to };
  const column = TIMESTAMP_COLUMN[to];
  if (column) update[column] = new Date().toISOString();

  let riderName: string | null = null;
  const method = formData.get("dispatchMethod") as string | null;
  if (to === "dispatched") {
    if (method === "courier") {
      const courierName = String(formData.get("courierName") ?? "").trim();
      if (!courierName) return { error: "Enter the courier's name." };
      update.dispatch_method = "courier";
      update.courier_name = courierName;
      update.tracking_number = String(formData.get("trackingNumber") ?? "").trim() || null;
      update.rider_staff_id = null;
    } else if (method === "rider") {
      const riderId = formData.get("riderStaffId") as string;
      const { data: rider } = await supabase
        .from("staff_profiles")
        .select("id, full_name")
        .eq("id", riderId)
        .eq("is_active", true)
        .maybeSingle();
      if (!rider) return { error: "Choose the rider delivering this order." };
      riderName = rider.full_name;
      update.dispatch_method = "rider";
      update.rider_staff_id = rider.id;
      update.courier_name = null;
      update.tracking_number = null;
    } else {
      return { error: "Choose how this order is being delivered." };
    }
  }

  // Conditional on the status we read, so two people clicking at once
  // can't both apply a transition (or restock twice).
  const { data: moved, error } = await supabase
    .from("orders")
    .update(update)
    .eq("id", orderId)
    .eq("fulfillment_status", from)
    .select("id")
    .maybeSingle();
  if (error) return { error: error.message };
  if (!moved) return { error: "Someone else just updated this order — refresh and try again." };

  const restocked: string[] = [];
  if (restock && (to === "cancelled" || to === "returned")) {
    for (const item of order.order_items ?? []) {
      if (!item.product_id) continue;
      await changeStock({
        productId: item.product_id,
        mode: "delta",
        value: item.quantity,
        reason: to === "cancelled" ? "cancellation" : "return",
        orderId,
        note: note || null,
        actor,
      });
      restocked.push(`${item.quantity}× ${item.product_name_snapshot}`);
    }
  }

  const how =
    to === "dispatched"
      ? update.dispatch_method === "courier"
        ? ` via ${update.courier_name}${update.tracking_number ? ` (tracking ${update.tracking_number})` : ""}`
        : ` with rider ${riderName}`
      : "";
  await logStaffActivity(actor, {
    action: "order.fulfillment",
    entityType: "order",
    entityId: orderId,
    summary: `Order ${order.paystack_reference}: ${FULFILLMENT_LABELS[from]} → ${FULFILLMENT_LABELS[to]}${how}${restocked.length ? `; restocked ${restocked.join(", ")}` : ""}${note ? ` — ${note}` : ""}`,
    changes: { fulfillment_status: { from, to } },
  });

  let notice: string | undefined;
  if (notify && (to === "dispatched" || to === "delivered")) {
    const sent =
      to === "dispatched"
        ? await sendOrderDispatchedEmail(order, {
            method: update.dispatch_method as "rider" | "courier",
            riderName,
            courierName: update.courier_name as string | null,
            trackingNumber: update.tracking_number as string | null,
          })
        : await sendOrderDeliveredEmail(order);
    notice = sent.ok
      ? `Customer emailed at ${order.customer_email}.`
      : `Status updated, but the customer email wasn't sent: ${sent.error}`;
  }
  if (to === "cancelled") {
    notice = "Order cancelled. If the customer paid, issue a refund below.";
  }

  revalidatePath(`/staff/dashboard/orders/${orderId}`);
  revalidatePath("/staff/dashboard/orders");
  revalidatePath("/staff/dashboard");
  revalidatePath(`/account/orders/${orderId}`);
  return { notice };
}
