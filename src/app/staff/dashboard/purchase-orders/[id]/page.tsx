import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getStaffSession } from "@/app/actions/staff-auth";
import { hasAbility } from "@/lib/staff-auth";
import { createServiceClient } from "@/lib/supabase/server";
import { formatMoney, formatNaira, toKobo, type Currency } from "@/lib/money";
import { PurchaseOrderStatusBadge } from "@/components/staff/PurchaseOrderStatusBadge";
import {
  AddLineForm,
  PurchaseOrderStatusButtons,
  ReceiveGoodsForm,
  RemoveLineButton,
  SupplierPaymentForm,
} from "@/components/staff/PurchaseOrderPanels";
import { ActivityList, type ActivityRow } from "@/components/staff/ActivityList";
import type { PurchaseOrderPayment, PurchaseOrderStatus } from "@/types/database";

export const dynamic = "force-dynamic";

interface Po {
  id: string;
  po_number: string;
  status: PurchaseOrderStatus;
  currency: Currency;
  exchange_rate: number;
  expected_date: string | null;
  notes: string | null;
  created_by_name: string;
  created_at: string;
  ordered_at: string | null;
  received_at: string | null;
  cancelled_at: string | null;
  supplier: { id: string; name: string; phone: string | null; email: string | null } | null;
  purchase_order_items: {
    id: string;
    product_id: string;
    quantity_ordered: number;
    quantity_received: number;
    unit_cost_minor: number;
    product: { name: string; stock_quantity: number } | null;
  }[];
}

export default async function PurchaseOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getStaffSession();
  if (!session || !hasAbility(session, "manage_purchasing")) redirect("/staff/dashboard?error=forbidden");

  const { id } = await params;
  const supabase = createServiceClient();
  const [{ data: po }, { data: payments }, { data: timeline }] = await Promise.all([
    supabase
      .from("purchase_orders")
      .select(
        "*, supplier:suppliers(id, name, phone, email), purchase_order_items(id, product_id, quantity_ordered, quantity_received, unit_cost_minor, product:products(name, stock_quantity))"
      )
      .eq("id", id)
      .maybeSingle<Po>(),
    supabase.from("purchase_order_payments").select("*").eq("purchase_order_id", id).order("paid_on", { ascending: false }),
    supabase
      .from("staff_activity_log")
      .select("id, staff_name, action, entity_type, entity_id, summary, changes, created_at")
      .eq("entity_type", "purchase_order")
      .eq("entity_id", id)
      .order("created_at", { ascending: false }),
  ]);
  if (!po) notFound();

  const rate = Number(po.exchange_rate);
  const items = [...po.purchase_order_items].sort((a, b) => (a.product?.name ?? "").localeCompare(b.product?.name ?? ""));
  const totalMinor = items.reduce((s, i) => s + i.quantity_ordered * i.unit_cost_minor, 0);
  const receivedMinor = items.reduce((s, i) => s + i.quantity_received * i.unit_cost_minor, 0);
  const paymentList = (payments ?? []) as PurchaseOrderPayment[];
  const paidMinor = paymentList.reduce((s, p) => s + p.amount_minor, 0);
  const anyReceived = items.some((i) => i.quantity_received > 0);
  const receivable = po.status === "ordered" || po.status === "partially_received";
  const money = (minor: number) => formatMoney(minor, po.currency);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-1 text-xs text-neutral-500">
            <Link href="/staff/dashboard/purchase-orders" className="hover:underline">
              Purchase orders
            </Link>{" "}
            /
          </p>
          <h1 className="font-display flex items-center gap-3 text-2xl font-bold tracking-tight text-brand-900">
            {po.po_number} <PurchaseOrderStatusBadge status={po.status} />
          </h1>
          <p className="text-sm text-neutral-500">
            {po.supplier?.name}
            {po.supplier?.phone && ` · ${po.supplier.phone}`} · {po.currency}
            {po.currency === "USD" && ` at ₦${rate.toLocaleString()}/$`} · created by {po.created_by_name}{" "}
            {new Date(po.created_at).toLocaleDateString()}
            {po.expected_date && ` · expected ${po.expected_date}`}
          </p>
          {po.notes && <p className="mt-1 text-sm text-neutral-600">{po.notes}</p>}
        </div>
        <PurchaseOrderStatusButtons
          poId={po.id}
          canOrder={po.status === "draft" && items.length > 0}
          canCancel={(po.status === "draft" || po.status === "ordered") && !anyReceived}
        />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        {[
          { label: "Order total", value: money(totalMinor), sub: po.currency === "USD" ? formatNaira(toKobo(totalMinor, "USD", rate)) : null },
          { label: "Received value", value: money(receivedMinor), sub: po.currency === "USD" ? formatNaira(toKobo(receivedMinor, "USD", rate)) : null },
          { label: "Paid to supplier", value: money(paidMinor), sub: null },
          { label: "Still owed", value: money(Math.max(totalMinor - paidMinor, 0)), sub: null },
        ].map((c) => (
          <div key={c.label} className="rounded-lg border border-neutral-200 bg-white p-4">
            <p className="font-display text-xl font-bold text-brand-900">{c.value}</p>
            <p className="text-sm text-neutral-500">{c.label}</p>
            {c.sub && <p className="text-xs text-neutral-400">≈ {c.sub}</p>}
          </div>
        ))}
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wider text-neutral-400">
                  <th className="px-3 py-2 font-medium">Product</th>
                  <th className="px-3 py-2 text-right font-medium">Ordered</th>
                  <th className="px-3 py-2 text-right font-medium">Received</th>
                  <th className="px-3 py-2 text-right font-medium">Unit cost</th>
                  <th className="px-3 py-2 text-right font-medium">Line total</th>
                  {po.status === "draft" && <th className="px-3 py-2" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {items.map((i) => (
                  <tr key={i.id}>
                    <td className="px-3 py-2">
                      <Link href={`/staff/dashboard/products/${i.product_id}/edit`} className="hover:text-brand-700 hover:underline">
                        {i.product?.name}
                      </Link>
                      <span className="block text-xs text-neutral-400">In stock now: {i.product?.stock_quantity}</span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{i.quantity_ordered}</td>
                    <td className={`px-3 py-2 text-right font-mono ${i.quantity_received === i.quantity_ordered ? "text-green-700" : ""}`}>
                      {i.quantity_received}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {money(i.unit_cost_minor)}
                      {po.currency === "USD" && (
                        <span className="block text-xs text-neutral-400">≈ {formatNaira(toKobo(i.unit_cost_minor, "USD", rate))}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{money(i.unit_cost_minor * i.quantity_ordered)}</td>
                    {po.status === "draft" && (
                      <td className="px-3 py-2 text-right">
                        <RemoveLineButton poId={po.id} itemId={i.id} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {po.status === "draft" && (
            <AddLineForm poId={po.id} currency={po.currency} existingIds={items.map((i) => i.product_id)} />
          )}
        </div>

        <div className="flex flex-col gap-4">
          {receivable && (
            <ReceiveGoodsForm
              poId={po.id}
              currency={po.currency}
              exchangeRate={rate}
              lines={items.map((i) => ({ id: i.id, name: i.product?.name ?? "item", remaining: i.quantity_ordered - i.quantity_received }))}
            />
          )}

          <div className="rounded-lg border border-neutral-200 bg-white p-4 text-sm">
            <p className="font-medium text-neutral-900">Supplier payments</p>
            {paymentList.length === 0 ? (
              <p className="mt-1 text-xs text-neutral-500">No payments recorded.</p>
            ) : (
              <ul className="mt-2 divide-y divide-neutral-100">
                {paymentList.map((p) => (
                  <li key={p.id} className="py-1.5 text-xs">
                    <span className="font-semibold">{money(p.amount_minor)}</span> on {p.paid_on}
                    {p.method && ` · ${p.method}`}
                    <span className="block text-neutral-400">
                      {p.note ? `${p.note} · ` : ""}recorded by {p.recorded_by_name}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {po.status !== "cancelled" && po.status !== "draft" && paidMinor < totalMinor && (
              <SupplierPaymentForm poId={po.id} currency={po.currency} />
            )}
          </div>
        </div>
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">Timeline</h2>
      <ActivityList rows={(timeline ?? []) as ActivityRow[]} emptyText="No activity yet." />
    </div>
  );
}
