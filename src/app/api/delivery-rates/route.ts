import { NextResponse } from "next/server";
import { getDeliveryRates } from "@/lib/delivery";

/** Client-side estimate only — CheckoutForm uses this to show a delivery
 *  fee preview as the customer picks a state. The real fee is always
 *  looked up again server-side in initiateCheckout from the state name
 *  alone, never trusted from the client. */
export async function GET() {
  const rates = await getDeliveryRates();
  return NextResponse.json({ rates });
}
