import Link from "next/link";
import { verifyTransaction, settlePaidOrder, markOrderFailed } from "@/lib/paystack";
import { ClearCartOnSuccess } from "@/components/ClearCartOnSuccess";

/**
 * Paystack redirects here after payment with ?reference=... (and sometimes
 * ?trxref=...). Those query params are fully attacker-controlled at this
 * point — a customer could hand-edit the URL — so this page NEVER trusts
 * them for anything beyond "which reference to ask Paystack about." The
 * actual success/failure comes only from verifyTransaction() calling
 * Paystack's own API.
 */
export default async function CheckoutCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string; trxref?: string }>;
}) {
  const { reference, trxref } = await searchParams;
  const ref = reference ?? trxref;

  if (!ref) {
    return (
      <Result
        heading="Something went wrong"
        message="No payment reference was provided."
      />
    );
  }

  const verification = await verifyTransaction(ref);

  if (!verification.ok) {
    return (
      <Result
        heading="Could not verify payment"
        message="We couldn't confirm this payment right now. If you were charged, contact us with your reference and we'll sort it out."
        reference={ref}
      />
    );
  }

  if (!verification.success) {
    await markOrderFailed(ref);
    return (
      <Result
        heading="Payment was not successful"
        message="Your payment did not go through. You have not been charged."
        reference={ref}
      />
    );
  }

  // Settles the order if this page wins the race against the webhook;
  // no-ops (alreadySettled) if the webhook got there first. Either way the
  // order ends up marked paid exactly once.
  await settlePaidOrder({
    reference: ref,
    amountKobo: verification.amountKobo,
    paidAt: verification.paidAt,
    feesKobo: verification.feesKobo,
    authorization: verification.authorization,
  });

  return (
    <>
      <ClearCartOnSuccess />
      <Result
        heading="Payment successful"
        message="Thank you — your order has been placed. A confirmation will be sent to your email."
        reference={ref}
        success
      />
    </>
  );
}

function Result({
  heading,
  message,
  reference,
  success,
}: {
  heading: string;
  message: string;
  reference?: string;
  success?: boolean;
}) {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1
        className={`mb-2 text-xl font-semibold ${success ? "text-[#16C784]" : "text-white"}`}
      >
        {heading}
      </h1>
      <p className="mb-6 text-white/60">{message}</p>
      {reference && (
        <p className="mb-6 text-xs text-white/35">Reference: {reference}</p>
      )}
      <Link href="/" className="text-sm font-medium text-accent-400 underline hover:text-white">
        {success ? "Continue shopping" : "Return to store"}
      </Link>
    </div>
  );
}
