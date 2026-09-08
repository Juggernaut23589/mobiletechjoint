import crypto from "crypto";
import { createServiceClient } from "@/lib/supabase/server";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY ?? "";

/**
 * Paystack's amount field is in the currency's minor unit — for NGN, kobo.
 * That matches this schema's price_kobo storage exactly; no conversion
 * needed when building the initialize request.
 */
export async function initializeTransaction(params: {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}): Promise<
  | { ok: true; authorizationUrl: string }
  | { ok: false; error: string }
> {
  if (!/^sk_(test|live)_/.test(PAYSTACK_SECRET)) {
    return { ok: false, error: "Payment gateway is not configured." };
  }

  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: params.email,
      amount: params.amountKobo,
      reference: params.reference,
      callback_url: params.callbackUrl,
      metadata: params.metadata ?? {},
    }),
  });

  const data = (await res.json()) as {
    status: boolean;
    message?: string;
    data?: { authorization_url: string };
  };

  if (!data.status || !data.data) {
    return { ok: false, error: data.message ?? "Could not start payment." };
  }
  return { ok: true, authorizationUrl: data.data.authorization_url };
}

/** Verifies a transaction directly with Paystack. Used by the callback page,
 *  which only receives a `reference` from the redirect — it must never
 *  trust query-string status/amount values, since those are fully
 *  attacker-controlled at that point. */
export async function verifyTransaction(reference: string): Promise<
  | {
      ok: true;
      success: boolean;
      amountKobo: number;
      currency: string;
      paidAt: string;
    }
  | { ok: false; error: string }
> {
  if (!/^sk_(test|live)_/.test(PAYSTACK_SECRET)) {
    return { ok: false, error: "Payment gateway is not configured." };
  }

  const res = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` } }
  );
  const data = (await res.json()) as {
    status: boolean;
    message?: string;
    data?: { status: string; amount: number; currency: string; paid_at: string };
  };

  if (!data.status || !data.data) {
    return { ok: false, error: data.message ?? "Verification failed." };
  }
  return {
    ok: true,
    success: data.data.status === "success",
    amountKobo: data.data.amount,
    currency: data.data.currency,
    paidAt: data.data.paid_at,
  };
}

/** Constant-time signature check for the webhook — timing-safe comparison,
 *  not `===`, and a length check first so a malformed header can't throw. */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature || !PAYSTACK_SECRET) return false;
  const hash = crypto.createHmac("sha512", PAYSTACK_SECRET).update(rawBody).digest("hex");
  if (hash.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
}

/**
 * The single settlement path for a successful payment, called from BOTH the
 * webhook and the callback page. Whichever arrives first wins; the other is
 * a safe no-op. This mirrors the pattern proven on the makeoverarena
 * Paystack integration: the UPDATE itself is the idempotency lock —
 * `.neq('status','paid')` means only the first caller gets a row back, so
 * stock is only ever decremented once per order regardless of which path
 * settles it, or how many times Paystack retries the webhook.
 */
export async function settlePaidOrder(params: {
  reference: string;
  amountKobo: number;
  paidAt: string;
}): Promise<{ settled: boolean; alreadySettled: boolean; reason?: string }> {
  const supabase = createServiceClient();

  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select("id, total_kobo, status")
    .eq("paystack_reference", params.reference)
    .maybeSingle();

  if (fetchError || !order) {
    return { settled: false, alreadySettled: false, reason: "order not found" };
  }

  if (order.total_kobo !== params.amountKobo) {
    // Amount mismatch is treated as a hard stop, not settled — this should
    // never happen unless something tampered with the request between
    // checkout-initiation and payment.
    console.error(
      `Paystack amount mismatch for ${params.reference}: order=${order.total_kobo} paystack=${params.amountKobo}`
    );
    return { settled: false, alreadySettled: false, reason: "amount mismatch" };
  }

  const { data: claimed, error: updateError } = await supabase
    .from("orders")
    .update({ status: "paid", paystack_verified_at: params.paidAt })
    .eq("paystack_reference", params.reference)
    .neq("status", "paid")
    .select("id");

  if (updateError) {
    console.error(`Settlement update failed for ${params.reference}:`, updateError.message);
    return { settled: false, alreadySettled: false, reason: "update failed" };
  }

  if (!claimed || claimed.length === 0) {
    // Someone else (webhook or callback) already settled this reference.
    return { settled: false, alreadySettled: true };
  }

  // Won the settlement race — decrement stock for each item. Stock was
  // already checked at checkout-initiation time; clamping at 0 here rather
  // than failing prevents a rare race from blocking a payment that has
  // already succeeded (a completed payment must never be left unsettled).
  const { data: items } = await supabase
    .from("order_items")
    .select("product_id, quantity")
    .eq("order_id", order.id);

  for (const item of items ?? []) {
    if (!item.product_id) continue;
    await supabase.rpc("decrement_stock", {
      p_product_id: item.product_id,
      p_quantity: item.quantity,
    });
  }

  return { settled: true, alreadySettled: false };
}

/** Marks an order failed. Guarded the same way — never downgrades an order
 *  a concurrent settlement has already marked paid. */
export async function markOrderFailed(reference: string): Promise<void> {
  const supabase = createServiceClient();
  await supabase
    .from("orders")
    .update({ status: "failed" })
    .eq("paystack_reference", reference)
    .neq("status", "paid");
}
