import Link from "next/link";
import { redirect } from "next/navigation";
import { getStaffSession } from "@/app/actions/staff-auth";
import { hasAbility } from "@/lib/staff-auth";
import { getCustomersPage } from "@/lib/staff";
import { pageRange, parsePage, sanitizeSearch } from "@/lib/staff-query";
import { formatNaira } from "@/lib/money";
import { Pagination } from "@/components/staff/Pagination";

export const dynamic = "force-dynamic";

export default async function StaffCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await getStaffSession();
  if (!session || (session.role !== "super_admin" && !hasAbility(session, "manage_customers"))) {
    redirect("/staff/dashboard?error=forbidden");
  }

  const params = await searchParams;
  const q = sanitizeSearch(params.q);
  const page = parsePage(params.page);
  const [from, to] = pageRange(page);
  const { customers, total } = await getCustomersPage({ search: q, from, to });

  return (
    <div>
      <h1 className="font-display mb-1 text-2xl font-bold tracking-tight text-brand-900">Customers</h1>
      <p className="mb-6 text-sm text-neutral-500">
        {total.toLocaleString()} {q ? "matching" : "registered"} customer{total === 1 ? "" : "s"}.
      </p>

      <form className="mb-4 flex flex-wrap gap-2">
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Search by name or phone…"
          className="min-w-0 flex-1 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-full bg-brand-900 px-4 py-2 text-sm font-semibold text-white">
          Search
        </button>
      </form>

      {customers.length === 0 ? (
        <p className="text-sm text-neutral-500">
          {q ? "No customers match that search." : "No registered customers yet."}
        </p>
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
      <Pagination basePath="/staff/dashboard/customers" params={{ q }} page={page} total={total} />
    </div>
  );
}
