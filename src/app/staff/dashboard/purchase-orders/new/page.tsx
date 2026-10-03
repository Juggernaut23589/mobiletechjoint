import Link from "next/link";
import { redirect } from "next/navigation";
import { getStaffSession } from "@/app/actions/staff-auth";
import { hasAbility } from "@/lib/staff-auth";
import { createServiceClient } from "@/lib/supabase/server";
import { PurchaseOrderForm } from "@/components/staff/PurchaseOrderForm";
import type { Currency } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function NewPurchaseOrderPage() {
  const session = await getStaffSession();
  if (!session || !hasAbility(session, "manage_purchasing")) redirect("/staff/dashboard?error=forbidden");

  const { data: suppliers } = await createServiceClient()
    .from("suppliers")
    .select("id, name, currency")
    .eq("is_active", true)
    .order("name");

  return (
    <div className="max-w-4xl">
      <h1 className="font-display mb-1 text-2xl font-bold tracking-tight text-brand-900">New purchase order</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Saved as a draft first, so you can check it before marking it as ordered.
      </p>
      {(suppliers ?? []).length === 0 ? (
        <p className="text-sm text-neutral-500">
          You need a supplier first —{" "}
          <Link href="/staff/dashboard/suppliers" className="text-brand-600 underline">
            add one
          </Link>
          .
        </p>
      ) : (
        <PurchaseOrderForm
          suppliers={(suppliers ?? []).map((s) => ({ id: s.id, name: s.name, currency: s.currency as Currency }))}
        />
      )}
    </div>
  );
}
