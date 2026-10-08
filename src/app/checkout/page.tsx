import { getCurrentUser } from "@/app/actions/account";
import { getCustomerProfile, getSavedPaymentMethods } from "@/lib/account";
import { CheckoutForm } from "@/components/CheckoutForm";

// Guest checkout is allowed — an account only personalises the form
// (prefilled details, saved cards) when one is logged in.
export default async function CheckoutPage() {
  const user = await getCurrentUser();

  const [profile, savedMethods] = user
    ? await Promise.all([getCustomerProfile(user.id), getSavedPaymentMethods(user.id)])
    : [null, []];

  return (
    <CheckoutForm
      defaultName={profile?.full_name ?? ""}
      defaultEmail={user?.email ?? ""}
      defaultPhone={profile?.phone ?? ""}
      savedMethods={savedMethods}
      isGuest={!user}
    />
  );
}
