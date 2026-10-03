import { sendEmail } from "@/lib/email";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://mobiletechjoint.com";

interface OrderForEmail {
  id: string;
  customer_name: string;
  customer_email: string;
  paystack_reference: string;
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "there";
}

export function sendOrderDispatchedEmail(
  order: OrderForEmail,
  dispatch: { method: "rider" | "courier"; riderName?: string | null; courierName?: string | null; trackingNumber?: string | null }
) {
  const how =
    dispatch.method === "courier"
      ? `It's with ${dispatch.courierName ?? "our courier partner"}${dispatch.trackingNumber ? ` — tracking number: ${dispatch.trackingNumber}` : ""}.`
      : `${dispatch.riderName ? `${dispatch.riderName}, our delivery rider,` : "Our delivery rider"} is bringing it to you.`;

  return sendEmail({
    to: order.customer_email,
    subject: `Your MobileTechJoint order ${order.paystack_reference} is on its way`,
    text: `Hi ${firstName(order.customer_name)},\n\nGood news — your order ${order.paystack_reference} has been dispatched. ${how}\n\nYou can check your order any time at ${SITE_URL}/account/orders/${order.id}\n\nThank you for shopping with MobileTechJoint.`,
  });
}

export function sendOrderDeliveredEmail(order: OrderForEmail) {
  return sendEmail({
    to: order.customer_email,
    subject: `Your MobileTechJoint order ${order.paystack_reference} has been delivered`,
    text: `Hi ${firstName(order.customer_name)},\n\nYour order ${order.paystack_reference} has been delivered. We hope you enjoy your gear!\n\nIf anything isn't right, just reply to this email or view your order at ${SITE_URL}/account/orders/${order.id}\n\nThank you for shopping with MobileTechJoint.`,
  });
}
