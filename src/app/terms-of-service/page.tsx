import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that apply when you buy from MobileTechJoint.",
};

export default function TermsOfServicePage() {
  return (
    <LegalPage title="Terms of Service" updated="October 2026">
      <p>
        These terms apply whenever you use mobiletechjoint.com or buy from us. By placing an
        order, you agree to them.
      </p>

      <h2>Products and pricing</h2>
      <p>
        We make every effort to describe and price products accurately. If an item is listed at an
        incorrect price due to a typographical or system error, we may cancel the order and refund
        you in full before it ships. Prices are in Nigerian Naira (₦) and may change without
        notice; the price charged is the one shown at the time you complete payment.
      </p>

      <h2>Orders and payment</h2>
      <p>
        An order is only confirmed once payment has been successfully processed through Paystack.
        We reserve the right to refuse or cancel any order — for example if an item is out of
        stock, if we suspect fraud, or if delivery isn&apos;t available to your address — in which
        case we&apos;ll notify you and refund any payment taken.
      </p>

      <h2>Delivery</h2>
      <p>
        Delivery estimates shown at checkout are our best estimate, not a guarantee. Risk in the
        goods passes to you once they&apos;re delivered to the address you provided; please make
        sure it&apos;s correct and that someone can receive the delivery.
      </p>

      <h2>Returns, refunds and warranty</h2>
      <p>
        See our <a href="/returns-refunds">Returns &amp; Refunds Policy</a> for how to return an
        item and how refunds are handled. Manufacturer warranties apply as stated on each product
        page.
      </p>

      <h2>Account responsibilities</h2>
      <p>
        If you create an account, you&apos;re responsible for keeping your login details
        confidential and for all activity under your account. Tell us immediately if you suspect
        unauthorised access.
      </p>

      <h2>Acceptable use</h2>
      <p>
        Don&apos;t use the site for any unlawful purpose, to attempt to defraud us or another
        customer, or to interfere with the site&apos;s normal operation.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, MobileTechJoint is not liable for indirect or
        consequential loss arising from your use of the site or a product bought through it, beyond
        the value of the order in question. Nothing in these terms limits any right you have that
        cannot be excluded under Nigerian consumer protection law.
      </p>

      <h2>Changes to these terms</h2>
      <p>
        We may update these terms from time to time; the current version always applies. Material
        changes will be reflected by an updated &quot;last updated&quot; date above.
      </p>

      <h2>Contact us</h2>
      <p>Questions about these terms: see the contact details in the site footer.</p>
    </LegalPage>
  );
}
