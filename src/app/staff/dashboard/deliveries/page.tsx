import { redirect } from "next/navigation";
import { getStaffSession } from "@/app/actions/staff-auth";
import { hasAbility } from "@/lib/staff-auth";
import { getDeliveryRates } from "@/lib/delivery";
import { DeliveryRateRow } from "@/components/staff/DeliveryRateRow";

export const dynamic = "force-dynamic";

export default async function StaffDeliveriesPage() {
  const session = await getStaffSession();
  if (!session || (session.role !== "super_admin" && !hasAbility(session, "manage_deliveries"))) {
    redirect("/staff/dashboard?error=forbidden");
  }

  const rates = await getDeliveryRates();
  const unpricedCount = rates.filter((r) => r.price_kobo === 0).length;

  return (
    <div>
      <h1 className="font-display mb-1 text-2xl font-bold tracking-tight text-brand-900">
        Delivery Pricing
      </h1>
      <p className="mb-6 text-sm text-neutral-500">
        One price per state — customers pick their exact local government area at checkout for
        the delivery address, but the fee is quoted by state.
        {unpricedCount > 0 && ` ${unpricedCount} states still need a price set.`}
      </p>

      <div className="flex flex-col rounded-lg border border-neutral-200 bg-white px-4">
        {rates.map((rate) => (
          <DeliveryRateRow key={rate.state} rate={rate} />
        ))}
      </div>
    </div>
  );
}
