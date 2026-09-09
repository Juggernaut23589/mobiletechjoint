import Link from "next/link";
import { redirect } from "next/navigation";
import { getStaffSession } from "@/app/actions/staff-auth";
import { hasAbility } from "@/lib/staff-auth";
import { getAllCustomers } from "@/lib/staff";
import { formatNaira } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function StaffCustomersPage() {
  const session = await getStaffSession();
  if (!session || (session.role !== "super_admin" && !hasAbility(session, "manage_customers"))) {
    redirect("/staff/dashboard?error=forbidden");
  }

  const customers = await getAllCustomers();

  return (
    <div>
      <h1 className="font-display mb-1 text-2xl font-bold tracking-tight text-brand-900">Customers</h1>
      <p className="mb-6 text-sm text-neutral-500">{customers.length} registered customers.</p>

      {customers.length === 0 ? (
        <p className="text-sm text-neutral-500">No registered customers yet.</p>
      ) : (
        <div className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
          {customers.map((customer) => (
            <Link
              key={customer.id}
              href={`/staff/dashboard/customers/${customer.id}`}
              className="flex flex-wrap items-center justify-between gap-2 p-4 hover:bg-neutral-50"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {customer.full_name ?? "Unnamed customer"}
                </p>
                <p className="text-xs text-neutral-500">
                  {customer.email} {customer.phone ? `· ${customer.phone}` : ""}
                </p>
              </div>
              <div className="text-right text-sm">
                <p className="font-semibold">{formatNaira(customer.total_spent_kobo)}</p>
                <p className="text-xs text-neutral-500">
                  {customer.order_count} order{customer.order_count === 1 ? "" : "s"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
