"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireStaffAbility, requireSuperAdmin } from "@/lib/staff-session";
import { logStaffActivity } from "@/lib/activity-log";
import { executeRefund, REFUND_APPROVAL_LIMIT_KOBO } from "@/lib/refunds";
import { formatNaira, nairaToKobo } from "@/lib/money";
import type { StaffSession } from "@/lib/staff-auth";
import type { Refund } from "@/types/database";

type Result = { error?: string; notice?: string };

function revalidateOrder(orderId: string) {
  revalidatePath(`/staff/dashboard/orders/${orderId}`);
  revalidatePath("/staff/dashboard/orders");
  revalidatePath("/staff/dashboard");
}

/** Staff with Orders access can refund up to REFUND_APPROVAL_LIMIT_KOBO
 *  straight away; above that the refund waits for a super admin. Super
 *  admins are never held for approval. */
export async function requestRefund(_prev: Result, formData: FormData): Promise<Result> {
  let actor: StaffSession;
  try {
    actor = await requireStaffAbility("manage_orders");
  } catch {
    return { error: "Forbidden." };
  }

  const orderId = formData.get("orderId") as string;
  const amountNaira = Number(formData.get("amountNaira"));
  const reason = String(formData.get("reason") ?? "").trim();
  const method = formData.get("method") === "offline" ? "offline" : "paystack";
  if (!orderId) return { error: "Missing order." };
  if (!Number.isFinite(amountNaira) || amountNaira <= 0) return { error: "Enter a valid refund amount." };
  if (!reason) return { error: "Give a reason for the refund." };
  const amountKobo = nairaToKobo(amountNaira);

  const supabase = createServiceClient();
  const [{ data: order }, { data: pending }] = await Promise.all([
    supabase
      .from("orders")
      .select("id, status, total_kobo, refunded_kobo, paystack_reference, order_items(product_id, product_name_snapshot, quantity)")
      .eq("id", orderId)
      .maybeSingle(),
    supabase.from("refunds").select("amount_kobo").eq("order_id", orderId).eq("status", "pending_approval"),
  ]);
  if (!order) return { error: "Order not found." };
  if (order.status !== "paid") return { error: "Only paid orders with money left to refund can be refunded." };

  const pendingKobo = (pending ?? []).reduce((sum, r) => sum + r.amount_kobo, 0);
  const refundableKobo = order.total_kobo - order.refunded_kobo - pendingKobo;
  if (amountKobo > refundableKobo) {
    return { error: `At most ${formatNaira(Math.max(refundableKobo, 0))} can still be refunded on this order.` };
  }

  const restockItems: Refund["restock_items"] = [];
  for (const item of order.order_items ?? []) {
    if (!item.product_id) continue;
    const qty = Number(formData.get(`restock_${item.product_id}`) ?? 0);
    if (!Number.isInteger(qty) || qty < 0 || qty > item.quantity) {
      return { error: `Restock quantity for ${item.product_name_snapshot} must be between 0 and ${item.quantity}.` };
    }
    if (qty > 0) restockItems.push({ product_id: item.product_id, name: item.product_name_snapshot, quantity: qty });
  }

  const needsApproval = actor.role !== "super_admin" && amountKobo > REFUND_APPROVAL_LIMIT_KOBO;
  const { data: refund, error } = await supabase
    .from("refunds")
    .insert({
      order_id: orderId,
      amount_kobo: amountKobo,
      reason,
      method,
      restock_items: restockItems,
      status: "pending_approval",
      requested_by: actor.userId,
      requested_by_name: actor.fullName,
      decided_by: needsApproval ? null : actor.userId,
      decided_by_name: needsApproval ? null : actor.fullName,
    })
    .select("*")
    .single();
  if (error || !refund) return { error: error?.message ?? "Could not create the refund." };

  if (needsApproval) {
    await logStaffActivity(actor, {
      action: "refund.request",
      entityType: "order",
      entityId: orderId,
      summary: `Requested a ${formatNaira(amountKobo)} refund on ${order.paystack_reference} (needs approval) — ${reason}`,
    });
    revalidateOrder(orderId);
    return { notice: `Refunds over ${formatNaira(REFUND_APPROVAL_LIMIT_KOBO)} need a super admin's approval — it's been sent for approval.` };
  }

  const result = await executeRefund(refund as Refund, actor);
  revalidateOrder(orderId);
  if (result.error) return { error: result.error };
  return {
    notice:
      method === "paystack"
        ? "Refund sent to Paystack. It usually reaches the customer within a few working days."
        : "Offline refund recorded.",
  };
}

export async function approveRefund(formData: FormData): Promise<Result> {
  let actor: StaffSession;
  try {
    actor = await requireSuperAdmin();
  } catch {
    return { error: "Only a super admin can approve refunds." };
  }
  const refundId = formData.get("refundId") as string;

  // Claim it first so a double-click can't execute the same refund twice.
  const { data: refund } = await createServiceClient()
    .from("refunds")
    .update({ status: "processing", decided_by: actor.userId, decided_by_name: actor.fullName })
    .eq("id", refundId)
    .eq("status", "pending_approval")
    .select("*")
    .maybeSingle();
  if (!refund) return { error: "This refund is no longer awaiting approval." };

  const result = await executeRefund(refund as Refund, actor);
  revalidateOrder(refund.order_id);
  return result.error ? { error: result.error } : { notice: "Refund approved and issued." };
}

export async function rejectRefund(formData: FormData): Promise<Result> {
  let actor: StaffSession;
  try {
    actor = await requireSuperAdmin();
  } catch {
    return { error: "Only a super admin can reject refunds." };
  }
  const refundId = formData.get("refundId") as string;
  const note = String(formData.get("note") ?? "").trim();

  const { data: refund } = await createServiceClient()
    .from("refunds")
    .update({
      status: "rejected",
      decided_by: actor.userId,
      decided_by_name: actor.fullName,
      failure_reason: note || null,
    })
    .eq("id", refundId)
    .eq("status", "pending_approval")
    .select("order_id, amount_kobo, requested_by_name")
    .maybeSingle();
  if (!refund) return { error: "This refund is no longer awaiting approval." };

  await logStaffActivity(actor, {
    action: "refund.reject",
    entityType: "order",
    entityId: refund.order_id,
    summary: `Rejected ${refund.requested_by_name}'s ${formatNaira(refund.amount_kobo)} refund request${note ? ` — ${note}` : ""}`,
  });
  revalidateOrder(refund.order_id);
  return { notice: "Refund request rejected." };
}
