import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature, settlePaidOrder, markOrderFailed } from "@/lib/paystack";
import type { PaystackAuthorization } from "@/lib/paystack";
import { handleRefundWebhook } from "@/lib/refunds";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const event = JSON.parse(rawBody) as {
    event: string;
    data: {
      reference: string;
      amount: number;
      paid_at: string;
      status: string;
      authorization?: PaystackAuthorization;
      id?: number | string;
      transaction_reference?: string;
    };
  };

  if (event.event === "charge.success") {
    // Safe to run more than once — Paystack retries webhook delivery, and
    // the callback page may settle this reference first. See settlePaidOrder.
    await settlePaidOrder({
      reference: event.data.reference,
      amountKobo: event.data.amount,
      paidAt: event.data.paid_at,
      authorization: event.data.authorization ?? null,
    });
  } else if (event.event === "charge.failed") {
    await markOrderFailed(event.data.reference);
  } else if (event.event.startsWith("refund.")) {
    await handleRefundWebhook(event.event, event.data);
  }

  return NextResponse.json({ received: true });
}
