import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Returns & Refunds",
  description: "MobileTechJoint's Terms of Sale, Returns, Refunds & Consumer Protection Policy.",
};

// See about/page.tsx for why this is needed: the shared SiteFooter reads
// runtime-only env vars the build step never has, so a fully static page
// would bake those in as empty forever without a revalidate window.
export const revalidate = 60;

export default function ReturnsRefundsPage() {
  return (
    <LegalPage title="Terms of Sale, Returns, Refunds & Consumer Protection Policy" updated="October 2026">
      <p>
        Welcome to MobileTechJoint (MTJ). We supply content-creation equipment, lighting
        equipment, tripods, microphones, power adapters, digital accessories, and other
        technology products through our online platforms and sales channels.
      </p>
      <p>
        By purchasing from MobileTechJoint, you agree to the terms outlined in this policy. These
        terms are designed to promote transparency, fair business practices, and customer
        satisfaction in accordance with the Federal Competition and Consumer Protection Act
        (FCCPA) 2018 and other applicable Nigerian laws.
      </p>
      <p>
        <strong>Consumer Protection Commitment:</strong> MobileTechJoint does not apply a blanket
        &quot;No Refund&quot; or &quot;No Return&quot; policy to purchases where a customer is
        entitled to a remedy under applicable law. Each request will be assessed based on the
        circumstances of the transaction and the customer&apos;s statutory rights.
      </p>

      <h2>General terms of sale</h2>
      <p>
        <strong>Product descriptions and accuracy.</strong> MobileTechJoint endeavours to provide
        accurate product descriptions, specifications, images, and functionality details.
        Customers are encouraged to review product specifications and compatibility requirements
        before completing a purchase.
      </p>
      <p>
        <strong>Order confirmation and cancellation.</strong> Orders are subject to confirmation
        and product availability. Customers who wish to cancel an order should contact our
        customer service team as soon as possible. Where an order has not been processed or
        dispatched, cancellation may be accommodated. For dispatched orders, cancellation or
        return will be assessed in line with applicable law and this policy. Any applicable
        charges must be lawful and communicated transparently. Where cancellation results from an
        error attributable to MobileTechJoint or an inability to fulfil a confirmed order, the
        customer will be informed of the available remedies, including a refund where applicable.
      </p>
      <p>
        <strong>Product inspection upon delivery.</strong> Customers are encouraged to inspect
        their purchases upon delivery to confirm that the correct product was supplied and that
        there is no visible damage or missing accessory. Any concerns should be reported promptly.
        Failure to report an issue immediately does not automatically remove any rights the
        customer may have under applicable law.
      </p>

      <h2>Returns and refunds</h2>
      <p>
        <strong>Defective or faulty products.</strong> Where a product is defective, does not
        function as represented, is not fit for its intended purpose, or otherwise fails to meet
        applicable legal requirements, customers may be entitled to a repair, replacement,
        refund, or other statutory remedy, depending on the circumstances and applicable law.
        MobileTechJoint will assess such complaints fairly and may conduct a reasonable technical
        inspection to determine the nature and cause of the reported fault.
      </p>
      <p>
        <strong>Incorrect or misrepresented products.</strong> If a customer receives a product
        different from the item ordered, or a product that materially differs from its agreed
        description or specifications, the customer should contact MobileTechJoint promptly.
        Where the complaint is verified, MobileTechJoint will provide an appropriate remedy in
        accordance with applicable law, which may include a replacement or refund.
      </p>
      <p>
        <strong>Change-of-mind returns.</strong> Requests to return a correctly supplied,
        non-defective product because of a change of preference may be considered at
        MobileTechJoint&apos;s discretion, subject to applicable law and the conditions
        communicated to the customer at the time of purchase. Where such returns are accepted,
        the following conditions may apply:
      </p>
      <ul>
        <li>The product must be unused and in its original packaging, where reasonably applicable.</li>
        <li>All original accessories, manuals, packaging, and promotional items supplied with the product must be returned.</li>
        <li>The customer must provide proof of purchase or a verifiable transaction reference.</li>
        <li>The product must not have been damaged, altered, or misused after delivery.</li>
        <li>Any applicable return conditions or charges must have been clearly communicated and must be lawful.</li>
      </ul>
      <p>
        These conditions do not restrict a customer&apos;s statutory rights in respect of
        defective, incorrect, or misrepresented goods.
      </p>
      <p>
        <strong>Products requiring special consideration.</strong> Certain products may require
        additional assessment before a return can be accepted, including: in-ear audio devices
        and other hygiene-sensitive products that have been unsealed; software, digital
        activation products, or electronically delivered items; products configured, modified, or
        customised specifically for a customer; and products showing evidence of accidental
        damage, liquid exposure, unauthorised modification, or misuse. These circumstances will
        be considered individually and do not automatically exclude a customer&apos;s rights
        where a product is defective or another statutory remedy applies.
      </p>

      <h2>Technical assessment and warranty</h2>
      <p>
        <strong>Product evaluation.</strong> Where technical assessment is necessary,
        MobileTechJoint may request that the product be presented or returned for inspection.
        Customers will be informed of the next steps and the expected assessment period. The
        assessment will help establish whether the reported issue relates to a manufacturing
        defect, product fault, compatibility issue, accidental damage, or another cause.
      </p>
      <p>
        <strong>Warranty coverage.</strong> Products may be covered by a manufacturer or supplier
        warranty, depending on the specific item purchased. The applicable warranty period,
        coverage, and conditions will be communicated where available. Warranty coverage may
        exclude damage resulting from misuse, accidents, liquid exposure, electrical faults,
        unauthorised repairs, or modifications, subject to the applicable warranty terms and
        consumer protection law. A warranty exclusion will not automatically remove any separate
        rights the customer may have under applicable law.
      </p>
      <p>
        <strong>Warranty claims.</strong> Customers requesting warranty support should provide
        proof of purchase and a description of the fault. MobileTechJoint will provide reasonable
        assistance with the applicable warranty process where available.
      </p>

      <h2>Refund processing</h2>
      <p>
        <strong>Approval of refunds.</strong> Refund requests will be reviewed based on the
        purchase details, the nature of the complaint, any necessary technical assessment, and
        applicable legal requirements. Approved refunds will ordinarily be made through the
        original payment method or another mutually agreed, verifiable method, subject to
        payment-provider procedures and applicable law.
      </p>
      <p>
        <strong>Processing time.</strong> MobileTechJoint will communicate the expected
        refund-processing timeline once a refund has been approved. Actual receipt of funds may
        depend on the relevant bank, card issuer, or payment service provider.
      </p>
      <p>
        <strong>Return and delivery costs.</strong> Where a return is required because of a
        verified fault, incorrect delivery, or another circumstance for which MobileTechJoint is
        responsible, the company will address reasonable return and delivery costs in accordance
        with applicable law. For eligible voluntary returns, responsibility for return shipping
        costs will be communicated before the return is accepted.
      </p>

      <h2>Customer responsibilities</h2>
      <p>Customers are expected to:</p>
      <ul>
        <li>Provide accurate order and delivery information.</li>
        <li>Use products in accordance with the manufacturer&apos;s instructions.</li>
        <li>Retain proof of purchase and relevant warranty documentation.</li>
        <li>Report product issues promptly and provide reasonable information to support an investigation.</li>
        <li>Return products and supplied accessories in the condition required for the applicable type of return, subject to statutory rights.</li>
      </ul>

      <h2>Customer complaints and dispute resolution</h2>
      <p>
        MobileTechJoint is committed to handling customer complaints professionally and fairly.
        Customers should first <a href="/contact">contact our support team</a> to report an issue
        and allow a reasonable opportunity for resolution. If a complaint remains unresolved,
        customers may seek assistance from the Federal Competition and Consumer Protection
        Commission (FCCPC) or another competent authority, as appropriate. Nothing in this policy
        limits any rights or remedies available to customers under applicable Nigerian law.
      </p>

      <h2>Policy updates</h2>
      <p>
        MobileTechJoint may update this policy from time to time to reflect changes in its
        operations, products, or applicable legal requirements. Updated terms will be made
        available through the company&apos;s official communication channels. The terms
        applicable to a particular transaction will be interpreted in accordance with applicable
        law.
      </p>

      <h2>Customer support</h2>
      <p>
        For returns, refunds, warranty claims, or other purchase-related concerns, please{" "}
        <a href="/contact">contact our support team</a> with your order details and a description
        of the issue.
      </p>
    </LegalPage>
  );
}
