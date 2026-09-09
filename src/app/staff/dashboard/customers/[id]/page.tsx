import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getStaffSession } from "@/app/actions/staff-auth";
import { hasAbility } from "@/lib/staff-auth";
import { getCustomerOrdersForStaff } from "@/lib/staff";
import { createServiceClient } from "@/lib/supabase/server";
import { formatNaira } from "@/lib/money";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";

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

  const orders = await getCustomerOrdersForStaff(id);
  const totalSpentKobo = orders
    .filter((o) => o.status === "paid")
    .reduce((sum, o) => sum + o.total_kobo, 0);

  return (
    <div>
      <h1 className="font-display mb-1 text-2xl font-bold tracking-tight text-brand-900">
        {profile.full_name ?? "Unnamed customer"}
      </h1>
      <p className="mb-6 text-sm text-neutral-500">
        {profile.phone ?? "No phone on file"} · Joined {new Date(profile.created_at).toLocaleDateString()}
      </p>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="font-display text-2xl font-bold text-brand-900">{formatNaira(totalSpentKobo)}</p>
          <p className="text-sm text-neutral-500">Total spent (paid orders)</p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="font-display text-2xl font-bold text-brand-900">{orders.length}</p>
          <p className="text-sm text-neutral-500">Total orders</p>
        </div>
      </div>

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
