import { NextRequest, NextResponse } from "next/server";
import { verifyOpayCallbackSignature, settleOpayOrder, markOpayOrderFailed } from "@/lib/opay";

/** OPay sends { payload: {...}, sha512, type } (not a header-based
 *  signature like Paystack) — see
 *  documentation.opaycheckout.com/payment-notifications-callbacks.html.
 *  Must respond 200 to acknowledge, or OPay keeps retrying for 72 hours. */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    payload?: {
      reference?: string;
      amount?: string;
      status?: string;
      transactionId?: string;
      timestamp?: string;
      fee?: string;
    };
    sha512?: string;
    type?: string;
  } | null;

  if (!body?.payload || !verifyOpayCallbackSignature(body.payload, body.sha512)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { payload } = body;
  const reference = payload.reference;
  if (!reference) {
    return NextResponse.json({ received: true });
  }

  if (payload.status === "SUCCESS") {
    // Safe to run more than once — OPay retries, and the callback page may
    // settle this reference first. See settleOpayOrder.
    await settleOpayOrder({
      reference,
      amountKobo: Math.round(Number(payload.amount ?? "0")),
      orderNo: payload.transactionId ?? "",
      verifiedAt: payload.timestamp ?? new Date().toISOString(),
      feeKobo: Math.round(Number(payload.fee ?? "0")),
    });
  } else if (payload.status === "FAIL" || payload.status === "CLOSE") {
    await markOpayOrderFailed(reference);
  }

  return NextResponse.json({ received: true });
}
