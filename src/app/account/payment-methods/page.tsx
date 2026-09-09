import { getCurrentUser } from "@/app/actions/account";
import { getSavedPaymentMethods } from "@/lib/account";
import { PaymentMethodRow } from "@/components/account/PaymentMethodRow";

export const dynamic = "force-dynamic";

export default async function PaymentMethodsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const methods = await getSavedPaymentMethods(user.id);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-brand-900">Payment Methods</h1>
      <p className="mb-6 text-sm text-neutral-500">
        We never store your card number — only a secure reusable token from Paystack.
        Cards are saved automatically when you check &quot;Save this card&quot; during checkout.
      </p>

      {methods.length === 0 ? (
        <p className="text-sm text-neutral-500">
          No saved cards yet. You&apos;ll be able to save one at checkout.
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
          {methods.map((method) => (
            <PaymentMethodRow key={method.id} method={method} />
          ))}
        </div>
      )}
    </div>
  );
}
