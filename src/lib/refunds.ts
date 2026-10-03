import { createServiceClient } from "@/lib/supabase/server";
import { createPaystackRefund } from "@/lib/paystack";
import { changeStock } from "@/lib/stock";
import { logStaffActivity } from "@/lib/activity-log";
import { formatNaira } from "@/lib/money";
import type { StaffSession } from "@/lib/staff-auth";
import type { Refund } from "@/types/database";

/** Refunds above this need a super admin's approval (super admins
 *  themselves are never blocked). ₦50,000. */
export const REFUND_APPROVAL_LIMIT_KOBO = 5_000_000;

async function reserveRefund(orderId: string, amountKobo: number): Promise<string | null> {
  const { error } = await createServiceClient().rpc("add_order_refund", {
    p_order_id: orderId,
    p_amount: amountKobo,
  });
  return error ? error.message : null;
}

/** Carries out an approved refund: reserves the amount against the order
 *  (the DB function refuses anything that would exceed what was paid),
 *  sends it to Paystack or records it as an offline refund, then restocks
 *  any returned items. On a Paystack rejection the reservation is reversed. */
export async function executeRefund(refund: Refund, actor: StaffSession): Promise<{ error?: string }> {
  const supabase = createServiceClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id, paystack_reference")
    .eq("id", refund.order_id)
    .single();

  const reserveError = await reserveRefund(refund.order_id, refund.amount_kobo);
  if (reserveError) {
    await supabase
      .from("refunds")
      .update({ status: "failed", failure_reason: reserveError })
      .eq("id", refund.id);
    return { error: reserveError };
  }

  if (refund.method === "paystack") {
    const result = await createPaystackRefund({
      reference: order!.paystack_reference,
      amountKobo: refund.amount_kobo,
      merchantNote: refund.reason,
    });
    if (!result.ok) {
      await reserveRefund(refund.order_id, -refund.amount_kobo);
      await supabase
        .from("refunds")
        .update({ status: "failed", failure_reason: result.error })
        .eq("id", refund.id);
      await logStaffActivity(actor, {
        action: "refund.failed",
        entityType: "order",
        entityId: refund.order_id,
        summary: `Paystack refund of ${formatNaira(refund.amount_kobo)} on ${order!.paystack_reference} failed: ${result.error}`,
      });
      return { error: `Paystack refused the refund: ${result.error}` };
    }
    const done = result.status === "processed";
    await supabase
      .from("refunds")
      .update({
        status: done ? "completed" : "processing",
        paystack_refund_id: result.refundId,
        completed_at: done ? new Date().toISOString() : null,
      })
      .eq("id", refund.id);
  } else {
    await supabase
      .from("refunds")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", refund.id);
  }

  for (const item of refund.restock_items) {
    if (item.quantity <= 0) continue;
    await changeStock({
      productId: item.product_id,
      mode: "delta",
      value: item.quantity,
      reason: "refund_restock",
      orderId: refund.order_id,
      note: refund.reason,
      actor,
    });
  }

  const restocked = refund.restock_items.filter((i) => i.quantity > 0);
  await logStaffActivity(actor, {
    action: "refund.issue",
    entityType: "order",
    entityId: refund.order_id,
    summary: `Refunded ${formatNaira(refund.amount_kobo)} on ${order!.paystack_reference} (${refund.method === "paystack" ? "via Paystack" : "recorded as paid offline"}) — ${refund.reason}${restocked.length ? `; restocked ${restocked.map((i) => `${i.quantity}× ${i.name}`).join(", ")}` : ""}`,
    changes: { amount_kobo: refund.amount_kobo, method: refund.method, restock_items: refund.restock_items },
  });
  return {};
}

/** Paystack's final word on an asynchronous refund. Idempotent: only a
 *  refund still in 'processing' is moved, so webhook retries are no-ops. */
export async function handleRefundWebhook(
  event: string,
  data: { id?: number | string; transaction_reference?: string; amount?: number; status?: string }
): Promise<void> {
  if (event !== "refund.processed" && event !== "refund.failed") return;
  const supabase = createServiceClient();

  let refundId: string | null = null;
  if (data.id != null) {
    const { data: byId } = await supabase
      .from("refunds")
      .select("id")
      .eq("paystack_refund_id", String(data.id))
      .maybeSingle();
    refundId = byId?.id ?? null;
  }
  if (!refundId && data.transaction_reference && data.amount) {
    const { data: order } = await supabase
      .from("orders")
      .select("id")
      .eq("paystack_reference", data.transaction_reference)
      .maybeSingle();
    if (order) {
      const { data: byOrder } = await supabase
        .from("refunds")
        .select("id")
        .eq("order_id", order.id)
        .eq("amount_kobo", data.amount)
        .eq("status", "processing")
        .order("created_at")
        .limit(1)
        .maybeSingle();
      refundId = byOrder?.id ?? null;
    }
  }
  if (!refundId) return;

  if (event === "refund.processed") {
    await supabase
      .from("refunds")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", refundId)
      .eq("status", "processing");
    return;
  }

  const { data: failed } = await supabase
    .from("refunds")
    .update({ status: "failed", failure_reason: "Paystack reported the refund failed" })
    .eq("id", refundId)
    .eq("status", "processing")
    .select("order_id, amount_kobo")
    .maybeSingle();
  if (failed) await reserveRefund(failed.order_id, -failed.amount_kobo);
}
