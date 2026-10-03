import Link from "next/link";
import { redirect } from "next/navigation";
import { getStaffSession } from "@/app/actions/staff-auth";
import { hasAbility } from "@/lib/staff-auth";
import {
  attachEmails,
  CUSTOMER_SEGMENTS,
  customerSegments,
  getAllCustomerSummaries,
  type CustomerSegment,
} from "@/lib/customers";
import { pageRange, parsePage, sanitizeSearch } from "@/lib/staff-query";
import { formatNaira } from "@/lib/money";
import { Pagination } from "@/components/staff/Pagination";

export const dynamic = "force-dynamic";

const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "spend", label: "Top spenders" },
  { value: "orders", label: "Most orders" },
  { value: "recent", label: "Most recent order" },
];

export default async function StaffCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; segment?: string; tag?: string; sort?: string; page?: string }>;
}) {
  const session = await getStaffSession();
  if (!session || !hasAbility(session, "manage_customers")) redirect("/staff/dashboard?error=forbidden");

  const params = await searchParams;
  const q = sanitizeSearch(params.q).toLowerCase();
  const segment = CUSTOMER_SEGMENTS.some((s) => s.value === params.segment) ? (params.segment as CustomerSegment) : undefined;
  const sort = SORTS.some((s) => s.value === params.sort) ? params.sort! : "newest";
  const page = parsePage(params.page);

  const all = await getAllCustomerSummaries();
  const allTags = [...new Set(all.flatMap((c) => c.tags))].sort();
  const tag = params.tag && allTags.includes(params.tag) ? params.tag : undefined;

  let rows = all;
  if (q) rows = rows.filter((c) => (c.full_name ?? "").toLowerCase().includes(q) || (c.phone ?? "").includes(q));
  if (segment) rows = rows.filter((c) => customerSegments(c).includes(segment));
  if (tag) rows = rows.filter((c) => c.tags.includes(tag));
  rows = [...rows].sort((a, b) => {
    if (sort === "spend") return b.total_spent_kobo - a.total_spent_kobo;
    if (sort === "orders") return b.order_count - a.order_count;
    if (sort === "recent") return (b.last_order_at ?? "").localeCompare(a.last_order_at ?? "");
    return b.created_at.localeCompare(a.created_at);
  });

  const [from, to] = pageRange(page);
  const customers = await attachEmails(rows.slice(from, to + 1));
  const totalSpent = rows.reduce((s, c) => s + c.total_spent_kobo, 0);
  const select = "rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm";
  const filters = { q: params.q, segment, tag, sort };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display mb-1 text-2xl font-bold tracking-tight text-brand-900">Customers</h1>
          <p className="text-sm text-neutral-500">
            {rows.length.toLocaleString()} {segment || tag || q ? "matching" : "registered"} customer
            {rows.length === 1 ? "" : "s"} · {formatNaira(totalSpent)} lifetime spend (net of refunds).
          </p>
        </div>
        <a
          href={`/staff/dashboard/customers/export?${new URLSearchParams(Object.entries(filters).filter(([, v]) => v) as [string, string][]).toString()}`}
          className="rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
        >
          Export these customers (CSV)
        </a>
      </div>

      <form className="mb-4 flex flex-wrap gap-2">
        <input
          name="q"
          type="search"
          defaultValue={params.q}
          placeholder="Search by name or phone…"
          className="min-w-0 flex-1 basis-48 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
        />
        <select name="segment" defaultValue={segment ?? ""} className={select}>
          <option value="">All segments</option>
          {CUSTOMER_SEGMENTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        {allTags.length > 0 && (
          <select name="tag" defaultValue={tag ?? ""} className={select}>
            <option value="">Any tag</option>
            {allTags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        )}
        <select name="sort" defaultValue={sort} className={select}>
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-full bg-brand-900 px-4 py-2 text-sm font-semibold text-white">
          Filter
        </button>
      </form>

      {customers.length === 0 ? (
        <p className="text-sm text-neutral-500">No customers match.</p>
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
                  {customerSegments(customer).includes("vip") && (
                    <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">VIP</span>
                  )}
                </p>
                <p className="text-xs text-neutral-500">
                  {customer.email} {customer.phone ? `· ${customer.phone}` : ""}
                  {customer.last_order_at && ` · last order ${new Date(customer.last_order_at).toLocaleDateString()}`}
                </p>
                {customer.tags.length > 0 && (
                  <p className="mt-1 flex flex-wrap gap-1">
                    {customer.tags.map((t) => (
                      <span key={t} className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-700">
                        {t}
                      </span>
                    ))}
                  </p>
                )}
              </div>
              <div className="text-right text-sm">
                <p className="font-semibold">{formatNaira(customer.total_spent_kobo)}</p>
                <p className="text-xs text-neutral-500">
                  {customer.order_count} paid order{customer.order_count === 1 ? "" : "s"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
      <Pagination basePath="/staff/dashboard/customers" params={filters} page={page} total={rows.length} />
    </div>
  );
}
