import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getStaffSession } from "@/app/actions/staff-auth";
import { hasAbility } from "@/lib/staff-auth";
import { getCustomerOrdersForStaff } from "@/lib/staff";
import { getSavedPaymentMethods } from "@/lib/account";
import { createServiceClient } from "@/lib/supabase/server";
import { formatNaira } from "@/lib/money";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { CustomerNoteForm, CustomerTagsForm } from "@/components/staff/CustomerCrmPanels";
import { customerSegments, CUSTOMER_SEGMENTS } from "@/lib/customers";

export const dynamic = "force-dynamic";

export default async function StaffCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getStaffSession();
  if (!session || (session.role !== "super_admin" && !hasAbility(session, "manage_customers"))) {
    redirect("/staff/dashboard?error=forbidden");
  }

  const { id } = await params;
  const supabase = createServiceClient();
  const { data: profile } = await supabase
    .from("customer_profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!profile) notFound();

  const [orders, paymentMethods, { data: notes }, { data: authUser }] = await Promise.all([
    getCustomerOrdersForStaff(id),
    getSavedPaymentMethods(id),
    supabase.from("customer_notes").select("id, body, staff_name, created_at").eq("customer_id", id).order("created_at", { ascending: false }),
    supabase.auth.admin.getUserById(id),
  ]);

  const paidOrders = orders.filter((o) => o.status === "paid" || o.status === "refunded");
  const totalSpentKobo = paidOrders.reduce((sum, o) => sum + o.total_kobo - o.refunded_kobo, 0);
  const paidDates = paidOrders.map((o) => o.paystack_verified_at ?? o.created_at).sort();
  const segments = customerSegments({
    order_count: paidOrders.length,
    total_spent_kobo: totalSpentKobo,
    created_at: profile.created_at,
    last_order_at: paidDates.at(-1) ?? null,
  });

  return (
    <div>
      <h1 className="font-display mb-1 text-2xl font-bold tracking-tight text-brand-900">
        {profile.full_name ?? "Unnamed customer"}
      </h1>
      <p className="mb-2 text-sm text-neutral-500">
        {authUser.user?.email ?? "No email"} · {profile.phone ?? "No phone on file"} · Joined{" "}
        {new Date(profile.created_at).toLocaleDateString()}
      </p>
      {segments.length > 0 && (
        <p className="mb-6 flex flex-wrap gap-1.5">
          {segments.map((s) => (
            <span key={s} className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
              {CUSTOMER_SEGMENTS.find((x) => x.value === s)?.label}
            </span>
          ))}
        </p>
      )}

      <div className="mb-6 rounded-lg border border-neutral-200 bg-white p-4">
        <p className="mb-2 text-sm font-medium text-neutral-900">Tags</p>
        <CustomerTagsForm customerId={profile.id} tags={profile.tags ?? []} />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        {[
          { label: "Lifetime spend (net)", value: formatNaira(totalSpentKobo) },
          { label: "Paid orders", value: String(paidOrders.length) },
          { label: "Average order", value: paidOrders.length ? formatNaira(Math.round(totalSpentKobo / paidOrders.length)) : "—" },
          { label: "Last order", value: paidDates.length ? new Date(paidDates.at(-1)!).toLocaleDateString() : "—" },
        ].map((c) => (
          <div key={c.label} className="rounded-lg border border-neutral-200 bg-white p-4">
            <p className="font-display text-xl font-bold text-brand-900">{c.value}</p>
            <p className="text-sm text-neutral-500">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="mb-6 rounded-lg border border-neutral-200 bg-white p-4">
        <p className="mb-2 text-sm font-medium text-neutral-900">Notes</p>
        <CustomerNoteForm customerId={profile.id} />
        {(notes ?? []).length > 0 && (
          <ul className="mt-4 divide-y divide-neutral-100">
            {(notes ?? []).map((n) => (
              <li key={n.id} className="py-2">
                <p className="whitespace-pre-wrap text-sm text-neutral-800">{n.body}</p>
                <p className="text-xs text-neutral-400">
                  {n.staff_name} · {new Date(n.created_at).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {paymentMethods.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">
            Saved payment methods
          </h2>
          <div className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
            {paymentMethods.map((method) => (
              <div key={method.id} className="flex items-center justify-between p-3 text-sm">
                <span className="capitalize">
                  {method.card_type ?? "Card"} •••• {method.last4}
                  {method.is_default && (
                    <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                      Default
                    </span>
                  )}
                </span>
                <span className="text-xs text-neutral-400">
                  {method.bank ? `${method.bank} · ` : ""}Exp {method.exp_month}/{method.exp_year}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">
        Order history
      </h2>
      {orders.length === 0 ? (
        <p className="text-sm text-neutral-500">No orders yet.</p>
      ) : (
        <div className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/staff/dashboard/orders/${order.id}`}
              className="flex flex-wrap items-center justify-between gap-2 p-4 hover:bg-neutral-50"
            >
              <div>
                <p className="text-sm font-medium">{order.paystack_reference}</p>
                <p className="text-xs text-neutral-500">
                  {new Date(order.created_at).toLocaleDateString()}
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
    </div>
  );
}
