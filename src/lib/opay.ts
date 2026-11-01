import crypto from "crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { changeStock } from "@/lib/stock";

const OPAY_SECRET = process.env.OPAY_SECRET_KEY ?? "";
const OPAY_PUBLIC = process.env.OPAY_PUBLIC_KEY ?? "";
const OPAY_MERCHANT_ID = process.env.OPAY_MERCHANT_ID ?? "";
// Defaults to the sandbox host — OPAY_ENV must be explicitly set to "live"
// to ever hit the production API, so a missing/misconfigured env var fails
// safe (test money, not real money).
const OPAY_BASE_URL =
  process.env.OPAY_ENV === "live"
    ? "https://liveapi.opaycheckout.com"
    : "https://testapi.opaycheckout.com";

function configured(): boolean {
  return Boolean(OPAY_SECRET && OPAY_PUBLIC && OPAY_MERCHANT_ID);
}

/** OPay's signature scheme (see documentation.opaycheckout.com/api-signature.html):
 *  HMAC-SHA512 of the JSON payload — keys sorted alphabetically — signed
 *  with the secret key, hex-encoded. Used both for the Query Payment
 *  Status request (Authorization header) and for verifying inbound
 *  callback payloads. */
function signPayload(payload: unknown): string {
  const sorted = sortKeysDeep(payload);
  const json = JSON.stringify(sorted);
  return crypto.createHmac("sha512", OPAY_SECRET).update(json).digest("hex");
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return Object.fromEntries(entries.map(([k, v]) => [k, sortKeysDeep(v)]));
  }
  return value;
}

/** Starts a Cashier payment — the OPay-hosted checkout page. amountKobo
 *  matches this schema's price_kobo storage (minor currency unit), same
 *  as Paystack's initializeTransaction. */
export async function initializeOpayTransaction(params: {
  reference: string;
  amountKobo: number;
  returnUrl: string;
  callbackUrl: string;
  cancelUrl: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
}): Promise<{ ok: true; authorizationUrl: string } | { ok: false; error: string }> {
  if (!configured()) {
    return { ok: false, error: "OPay payment is not configured." };
  }

  const res = await fetch(`${OPAY_BASE_URL}/api/v1/international/cashier/create`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPAY_PUBLIC}`,
      MerchantId: OPAY_MERCHANT_ID,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      country: "NG",
      reference: params.reference,
      amount: { total: params.amountKobo, currency: "NGN" },
      returnUrl: params.returnUrl,
      callbackUrl: params.callbackUrl,
      cancelUrl: params.cancelUrl,
      product: { name: "MobileTechJoint order", description: `Order ${params.reference}` },
      userInfo: {
        userEmail: params.customerEmail,
        userName: params.customerName,
        ...(params.customerPhone ? { userMobile: params.customerPhone } : {}),
      },
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    code?: string;
    message?: string;
    data?: { cashierUrl?: string };
  };

  if (data.code !== "00000" || !data.data?.cashierUrl) {
    return { ok: false, error: data.message ?? "Could not start OPay payment." };
  }
  return { ok: true, authorizationUrl: data.data.cashierUrl };
}

/** Queries OPay directly for a transaction's current status — used by the
 *  callback page the same way verifyTransaction is for Paystack: the
 *  redirect query string is never trusted for success/failure, only for
 *  which reference to ask OPay about. */
export async function queryOpayPaymentStatus(reference: string): Promise<
  | { ok: true; success: boolean; amountKobo: number; orderNo: string; createdAt: string }
  | { ok: false; error: string }
> {
  if (!configured()) {
    return { ok: false, error: "OPay payment is not configured." };
  }

  const body = { reference, country: "NG" };
  const signature = signPayload(body);

  const res = await fetch(`${OPAY_BASE_URL}/api/v1/international/cashier/status`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${signature}`,
      MerchantId: OPAY_MERCHANT_ID,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json().catch(() => ({}))) as {
    code?: string;
    message?: string;
    data?: { status?: string; amount?: { total: number }; orderNo?: string; createTime?: number };
  };

  if (data.code !== "00000" || !data.data) {
    return { ok: false, error: data.message ?? "Verification failed." };
  }
  return {
    ok: true,
    success: data.data.status === "SUCCESS",
    amountKobo: data.data.amount?.total ?? 0,
    orderNo: data.data.orderNo ?? "",
    createdAt: data.data.createTime ? new Date(data.data.createTime).toISOString() : new Date().toISOString(),
  };
}

/** Verifies an inbound callback actually came from OPay — constant-time
 *  comparison, same reasoning as Paystack's verifyWebhookSignature. */
export function verifyOpayCallbackSignature(payload: unknown, sha512: string | undefined | null): boolean {
  if (!sha512 || !OPAY_SECRET) return false;
  const expected = signPayload(payload);
  if (expected.length !== sha512.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sha512));
}

/** Same settlement shape and idempotency pattern as settlePaidOrder in
 *  lib/paystack.ts (the UPDATE's `.neq('status','paid')` is the lock),
 *  just writing to the opay_* columns — called from both the callback
 *  page and the OPay webhook, whichever arrives first wins. */
export async function settleOpayOrder(params: {
  reference: string;
  amountKobo: number;
  orderNo: string;
  verifiedAt: string;
  feeKobo?: number;
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
    console.error(
      `OPay amount mismatch for ${params.reference}: order=${order.total_kobo} opay=${params.amountKobo}`
    );
    return { settled: false, alreadySettled: false, reason: "amount mismatch" };
  }

  const { data: claimed, error: updateError } = await supabase
    .from("orders")
    .update({
      status: "paid",
      opay_order_no: params.orderNo,
      opay_verified_at: params.verifiedAt,
      opay_fee_kobo: params.feeKobo ?? 0,
    })
    .eq("paystack_reference", params.reference)
    .neq("status", "paid")
    .select("id");

  if (updateError) {
    console.error(`OPay settlement update failed for ${params.reference}:`, updateError.message);
    return { settled: false, alreadySettled: false, reason: "update failed" };
  }

  if (!claimed || claimed.length === 0) {
    return { settled: false, alreadySettled: true };
  }

  const { data: items } = await supabase
    .from("order_items")
    .select("product_id, quantity")
    .eq("order_id", order.id);

  for (const item of items ?? []) {
    if (!item.product_id) continue;
    try {
      await changeStock({
        productId: item.product_id,
        mode: "delta",
        value: -item.quantity,
        reason: "sale",
        orderId: order.id,
      });
    } catch (err) {
      console.error(`Stock decrement failed for order ${order.id}:`, err);
    }
  }

  return { settled: true, alreadySettled: false };
}

/** Mirrors markOrderFailed in lib/paystack.ts. */
export async function markOpayOrderFailed(reference: string): Promise<void> {
  const supabase = createServiceClient();
  await supabase
    .from("orders")
    .update({ status: "failed" })
    .eq("paystack_reference", reference)
    .neq("status", "paid");
}
