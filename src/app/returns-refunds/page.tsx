import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Returns & Refunds",
  description: "How to return an item and how refunds are handled.",
};

export default function ReturnsRefundsPage() {
  return (
    <LegalPage title="Returns & Refunds Policy" updated="October 2026">
      <h2>Faulty or damaged items</h2>
      <p>
        All products carry the manufacturer&apos;s warranty. If an item arrives faulty or damaged,
        contact us within <strong>7 days</strong> of delivery with your order number and a photo or
        description of the issue, and we&apos;ll arrange a replacement or a refund — whichever you
        prefer.
      </p>

      <h2>Change of mind</h2>
      <p>
        Unopened items in their original, undamaged packaging can be returned within the same
        7-day window for a refund. The item must be exactly as sent — unused, with all accessories,
        manuals and packaging intact. Items that have been opened, used, or show signs of wear
        can&apos;t be accepted as a change-of-mind return, in fairness to the next customer.
      </p>

      <h2>How to start a return</h2>
      <p>
        Contact us (see the details in the site footer) with your order number and the reason for
        the return. We&apos;ll confirm whether the item is eligible and arrange collection or tell
        you where to send it. Please don&apos;t send an item back before we&apos;ve confirmed the
        return — we can&apos;t guarantee a return sent without confirmation will be matched to your
        order.
      </p>

      <h2>Refunds</h2>
      <p>
        Once a return is received and inspected, refunds are processed back to your original
        payment method through Paystack. Paystack&apos;s own processing times apply after we issue
        the refund — typically a few business days, depending on your bank. Delivery fees are
        refunded only when the return is due to our error (wrong or faulty item); they&apos;re not
        refundable for a change-of-mind return.
      </p>

      <h2>Order cancellations</h2>
      <p>
        You can cancel an order free of charge any time before it ships — contact us as soon as
        possible. An unpaid order that&apos;s never completed at checkout is automatically released
        after 24 hours and never charges you.
      </p>

      <h2>Contact us</h2>
      <p>Questions about a return or refund: see the contact details in the site footer.</p>
    </LegalPage>
  );
}
