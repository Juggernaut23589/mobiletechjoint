import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/actions/account";
import { getCustomerProfile, getSavedPaymentMethods } from "@/lib/account";
import { CheckoutForm } from "@/components/CheckoutForm";

export default async function CheckoutPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/account/login?next=/checkout"); // proxy.ts already does this; defense in depth

  const [profile, savedMethods] = await Promise.all([
    getCustomerProfile(user.id),
    getSavedPaymentMethods(user.id),
  ]);

  return (
    <CheckoutForm
      defaultName={profile?.full_name ?? ""}
      defaultEmail={user.email ?? ""}
      defaultPhone={profile?.phone ?? ""}
      savedMethods={savedMethods}
    />
  );
}
