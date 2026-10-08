import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How MobileTechJoint collects, uses and protects your personal data.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="October 2026">
      <p>
        This policy explains what personal data MobileTechJoint (&quot;we&quot;, &quot;us&quot;)
        collects when you use mobiletechjoint.com, why we collect it, and the choices you have.
        It applies to visitors, account holders, and anyone who places an order, including as a
        guest.
      </p>

      <h2>What we collect</h2>
      <p>Depending on how you use the site, we collect:</p>
      <ul>
        <li>
          <strong>Order details</strong> — name, email, phone number, delivery address and state/LGA,
          and what you bought, whether or not you create an account.
        </li>
        <li>
          <strong>Account details</strong> — email and a securely hashed password, if you choose to
          create one. We never see or store your password in plain text.
        </li>
        <li>
          <strong>Payment information</strong> — we do not collect or store your card number, CVV or
          bank details. Payments are processed directly by Paystack, a PCI-DSS compliant payment
          processor; we only receive confirmation that a payment succeeded, and, if you opt to save
          a card, a tokenised authorization code from Paystack that lets us charge that card again
          with your consent — never the card details themselves.
        </li>
        <li>
          <strong>Session cookies</strong> — used to keep you signed in and to remember items in
          your cart. We do not currently use third-party advertising or analytics cookies.
        </li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To process, fulfil, and deliver your orders, and to contact you about them.</li>
        <li>To provide customer support and respond to enquiries.</li>
        <li>To prevent fraud and keep the store secure.</li>
        <li>To send order confirmations and, if you&apos;ve opted in, occasional product updates.</li>
      </ul>
      <p>We do not sell your personal data to anyone.</p>

      <h2>Who we share it with</h2>
      <ul>
        <li>
          <strong>Paystack</strong>, to process payments — governed by Paystack&apos;s own privacy
          policy.
        </li>
        <li>
          <strong>Delivery partners</strong>, limited to the name, phone number and address needed
          to get your order to you.
        </li>
        <li>Nobody else, except where required by law.</li>
      </ul>

      <h2>How long we keep it</h2>
      <p>
        Order records are kept for as long as needed for accounting, warranty and legal purposes.
        If you delete your account, we remove your profile details but retain the underlying order
        records, as required for financial record-keeping.
      </p>

      <h2>Your rights</h2>
      <p>
        Under the Nigeria Data Protection Act, you can ask us to access, correct, or delete the
        personal data we hold about you, or to tell you what we hold and why. To make a request,
        contact us using the details below.
      </p>

      <h2>Contact us</h2>
      <p>
        Questions about this policy or your data: see the contact details in the site footer, or
        reach us on Instagram.
      </p>
    </LegalPage>
  );
}
