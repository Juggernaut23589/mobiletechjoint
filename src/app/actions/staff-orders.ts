"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireStaffAbility } from "@/lib/staff-session";
import { logStaffActivity } from "@/lib/activity-log";
import type { StaffSession } from "@/lib/staff-auth";

/** Manual status correction (e.g. marking a paid order refunded after an
 *  offline refund). Deliberately does NOT allow setting "paid" — that
 *  only ever happens through the Paystack settlement path
 *  (lib/paystack.ts's settlePaidOrder), never a manual staff action, so a
 *  staff member can't fabricate a payment that didn't happen. */
export async function updateOrderStatus(formData: FormData): Promise<{ error?: string }> {
  let actor: StaffSession;
  try {
    actor = await requireStaffAbility("manage_orders");
  } catch {
    return { error: "Forbidden." };
  }

  const orderId = formData.get("orderId") as string;
  const status = formData.get("status") as string;
  if (!orderId) return { error: "Missing order." };
  if (!["failed", "refunded"].includes(status)) {
    return { error: "Staff can only mark an order failed or refunded." };
  }

  const supabase = createServiceClient();
  const { data: order } = await supabase
    .from("orders")
    .select("status, paystack_reference")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { error: "Order not found." };

  const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
  if (error) return { error: error.message };

  await logStaffActivity(actor, {
    action: "order.status",
    entityType: "order",
    entityId: orderId,
    summary: `Marked order ${order.paystack_reference} ${status} (was ${order.status})`,
    changes: { status: { from: order.status, to: status } },
  });

  revalidatePath(`/staff/dashboard/orders/${orderId}`);
  revalidatePath("/staff/dashboard/orders");
  return {};
}
