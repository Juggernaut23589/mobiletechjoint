import { redirect } from "next/navigation";
import { getStaffSession } from "@/app/actions/staff-auth";
import { createServiceClient } from "@/lib/supabase/server";
import { pageRange, parsePage, sanitizeSearch } from "@/lib/staff-query";
import { ActivityList, type ActivityRow } from "@/components/staff/ActivityList";
import { Pagination } from "@/components/staff/Pagination";

export const dynamic = "force-dynamic";

const ENTITY_TYPES = [
  { value: "product", label: "Products & stock" },
  { value: "order", label: "Orders" },
  { value: "expense", label: "Expenses" },
  { value: "purchase_order", label: "Purchase orders" },
  { value: "supplier", label: "Suppliers" },
  { value: "delivery_rate", label: "Delivery pricing" },
  { value: "customer", label: "Customer emails" },
  { value: "cross_sell", label: "Cross-sells" },
  { value: "staff", label: "Team & access" },
];

export default async function StaffActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; staff?: string; page?: string }>;
}) {
  const session = await getStaffSession();
  if (!session || session.role !== "super_admin") redirect("/staff/dashboard?error=forbidden");

  const params = await searchParams;
  const q = sanitizeSearch(params.q);
  const type = ENTITY_TYPES.some((t) => t.value === params.type) ? params.type : undefined;
  const page = parsePage(params.page);

  const supabase = createServiceClient();
  const { data: staff } = await supabase
    .from("staff_profiles")
    .select("id, full_name")
    .order("full_name");
  const staffId = staff?.some((s) => s.id === params.staff) ? params.staff : undefined;

  let query = supabase
    .from("staff_activity_log")
    .select("id, staff_name, action, entity_type, entity_id, summary, changes, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(...pageRange(page));
  if (q) query = query.ilike("summary", `%${q}%`);
  if (type) query = query.eq("entity_type", type);
  if (staffId) query = query.eq("staff_id", staffId);
  const { data, count, error } = await query;

  return (
    <div>
      <h1 className="font-display mb-1 text-2xl font-bold tracking-tight text-brand-900">Activity log</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Every change made from the staff dashboard — who did it, when, and what changed.
      </p>

      <form className="mb-4 flex flex-wrap gap-2">
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Search activity…"
          className="min-w-0 flex-1 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
        />
        <select name="type" defaultValue={type ?? ""} className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm">
          <option value="">All areas</option>
          {ENTITY_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <select name="staff" defaultValue={staffId ?? ""} className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm">
          <option value="">All staff</option>
          {(staff ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.full_name}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-full bg-brand-900 px-4 py-2 text-sm font-semibold text-white">
          Filter
        </button>
      </form>

      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Couldn&apos;t load the activity log: {error.message}
        </p>
      ) : (
        <>
          <ActivityList rows={(data ?? []) as ActivityRow[]} emptyText="No activity matches these filters." />
          <Pagination
            basePath="/staff/dashboard/activity"
            params={{ q, type, staff: staffId }}
            page={page}
            total={count ?? 0}
          />
        </>
      )}
    </div>
  );
}
