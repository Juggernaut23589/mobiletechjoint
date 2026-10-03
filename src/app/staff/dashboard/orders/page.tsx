import Link from "next/link";
import { redirect } from "next/navigation";
import { getStaffSession } from "@/app/actions/staff-auth";
import { hasAbility } from "@/lib/staff-auth";
import { createServiceClient } from "@/lib/supabase/server";
import { isIsoDate, pageRange, parsePage, sanitizeSearch } from "@/lib/staff-query";
import { formatNaira } from "@/lib/money";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { Pagination } from "@/components/staff/Pagination";

export const dynamic = "force-dynamic";

const STATUSES = ["pending", "paid", "failed", "refunded"];

export default async function StaffOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; from?: string; to?: string; page?: string }>;
}) {
  const session = await getStaffSession();
  if (!session || (session.role !== "super_admin" && !hasAbility(session, "manage_orders"))) {
    redirect("/staff/dashboard?error=forbidden");
  }

  const params = await searchParams;
  const q = sanitizeSearch(params.q);
  const status = STATUSES.includes(params.status ?? "") ? params.status : undefined;
  const from = isIsoDate(params.from) ? params.from : undefined;
  const to = isIsoDate(params.to) ? params.to : undefined;
  const page = parsePage(params.page);

  let query = createServiceClient()
    .from("orders")
    .select("id, customer_name, customer_email, paystack_reference, created_at, total_kobo, status", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(...pageRange(page));
  if (q) {
    query = query.or(
      `paystack_reference.ilike.%${q}%,customer_name.ilike.%${q}%,customer_email.ilike.%${q}%,customer_phone.ilike.%${q}%`
    );
  }
  if (status) query = query.eq("status", status);
  if (from) query = query.gte("created_at", `${from}T00:00:00`);
  if (to) query = query.lte("created_at", `${to}T23:59:59.999`);
  const { data: orders, count } = await query;

  const hasFilters = Boolean(q || status || from || to);

  return (
    <div>
      <h1 className="font-display mb-1 text-2xl font-bold tracking-tight text-brand-900">Orders</h1>
      <p className="mb-6 text-sm text-neutral-500">
        {(count ?? 0).toLocaleString()} {hasFilters ? "matching" : "total"} order{count === 1 ? "" : "s"}.
      </p>

      <form className="mb-4 flex flex-wrap gap-2">
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Reference, name, email or phone…"
          className="min-w-0 flex-1 basis-56 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
        />
        <select name="status" defaultValue={status ?? ""} className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm capitalize">
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1 text-xs text-neutral-500">
          From
          <input name="from" type="date" defaultValue={from} className="rounded-md border border-neutral-300 bg-white px-2 py-2 text-sm" />
        </label>
        <label className="flex items-center gap-1 text-xs text-neutral-500">
          To
          <input name="to" type="date" defaultValue={to} className="rounded-md border border-neutral-300 bg-white px-2 py-2 text-sm" />
        </label>
        <button type="submit" className="rounded-full bg-brand-900 px-4 py-2 text-sm font-semibold text-white">
          Filter
        </button>
        {hasFilters && (
          <Link href="/staff/dashboard/orders" className="self-center text-xs text-neutral-500 hover:underline">
            Clear
          </Link>
        )}
      </form>

      {!orders || orders.length === 0 ? (
        <p className="text-sm text-neutral-500">{hasFilters ? "No orders match these filters." : "No orders yet."}</p>
      ) : (
        <div className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/staff/dashboard/orders/${order.id}`}
              className="flex flex-wrap items-center justify-between gap-2 p-4 hover:bg-neutral-50"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {order.customer_name} · {order.customer_email}
                </p>
                <p className="text-xs text-neutral-500">
                  {order.paystack_reference} · {new Date(order.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold">{formatNaira(order.total_kobo)}</span>
                <OrderStatusBadge status={order.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
      <Pagination
        basePath="/staff/dashboard/orders"
        params={{ q, status, from, to }}
        page={page}
        total={count ?? 0}
      />
    </div>
  );
}
