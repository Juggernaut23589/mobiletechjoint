import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { getStaffSession } from "@/app/actions/staff-auth";
import { hasAbility } from "@/lib/staff-auth";
import { createServiceClient } from "@/lib/supabase/server";
import { formatMoney, formatNaira, toKobo, type Currency } from "@/lib/money";
import { pageRange, parsePage } from "@/lib/staff-query";
import { Pagination } from "@/components/staff/Pagination";
import { SheetUpload } from "@/components/staff/SheetUpload";
import { PurchaseOrderStatusBadge, PO_STATUS_LABELS } from "@/components/staff/PurchaseOrderStatusBadge";
import { applyCostImport, previewCostImport } from "@/app/actions/staff-purchasing";
import type { PurchaseOrderStatus } from "@/types/database";

export const dynamic = "force-dynamic";

const STATUSES = Object.keys(PO_STATUS_LABELS) as PurchaseOrderStatus[];

interface PoRow {
  id: string;
  po_number: string;
  status: PurchaseOrderStatus;
  currency: Currency;
  exchange_rate: number;
  expected_date: string | null;
  created_at: string;
  supplier: { name: string } | null;
  purchase_order_items: { quantity_ordered: number; quantity_received: number; unit_cost_minor: number }[];
  purchase_order_payments: { amount_minor: number }[];
}

export default async function PurchaseOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; supplier?: string; page?: string }>;
}) {
  const session = await getStaffSession();
  if (!session || !hasAbility(session, "manage_purchasing")) redirect("/staff/dashboard?error=forbidden");

  const params = await searchParams;
  const page = parsePage(params.page);
  const supabase = createServiceClient();
  const { data: suppliers } = await supabase.from("suppliers").select("id, name").order("name");
  const status = STATUSES.includes(params.status as PurchaseOrderStatus) ? params.status : undefined;
  const supplier = suppliers?.some((s) => s.id === params.supplier) ? params.supplier : undefined;

  let query = supabase
    .from("purchase_orders")
    .select(
      "id, po_number, status, currency, exchange_rate, expected_date, created_at, supplier:suppliers(name), purchase_order_items(quantity_ordered, quantity_received, unit_cost_minor), purchase_order_payments(amount_minor)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(...pageRange(page));
  if (status) query = query.eq("status", status);
  if (supplier) query = query.eq("supplier_id", supplier);
  const { data, count } = await query.returns<PoRow[]>();
  const orders = data ?? [];

  const { count: uncosted } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("status", "published")
    .is("cost_kobo", null);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display mb-1 text-2xl font-bold tracking-tight text-brand-900">Purchase orders</h1>
          <p className="text-sm text-neutral-500">
            Stock you&apos;ve ordered from suppliers. Receiving goods adds them to stock and updates each
            product&apos;s average cost.
          </p>
        </div>
        <Link
          href="/staff/dashboard/purchase-orders/new"
          className="inline-flex items-center gap-1.5 rounded-full bg-brand-gradient px-4 py-2 text-sm font-semibold text-white shadow-glow"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          New purchase order
        </Link>
      </div>

      <form className="mb-4 flex flex-wrap gap-2">
        <select name="status" defaultValue={status ?? ""} className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm">
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {PO_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <select name="supplier" defaultValue={supplier ?? ""} className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm">
          <option value="">All suppliers</option>
          {(suppliers ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-full bg-brand-900 px-4 py-2 text-sm font-semibold text-white">
          Filter
        </button>
      </form>

      {orders.length === 0 ? (
        <p className="mb-8 text-sm text-neutral-500">
          No purchase orders yet.{" "}
          {(suppliers ?? []).length === 0 && (
            <>
              Start by{" "}
              <Link href="/staff/dashboard/suppliers" className="text-brand-600 underline">
                adding a supplier
              </Link>
              .
            </>
          )}
        </p>
      ) : (
        <div className="mb-2 flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
          {orders.map((po) => {
            const ordered = po.purchase_order_items.reduce((s, i) => s + i.quantity_ordered * i.unit_cost_minor, 0);
            const units = po.purchase_order_items.reduce((s, i) => s + i.quantity_ordered, 0);
            const received = po.purchase_order_items.reduce((s, i) => s + i.quantity_received, 0);
            const paid = po.purchase_order_payments.reduce((s, p) => s + p.amount_minor, 0);
            return (
              <Link
                key={po.id}
                href={`/staff/dashboard/purchase-orders/${po.id}`}
                className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-neutral-50"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {po.po_number} · {po.supplier?.name}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {new Date(po.created_at).toLocaleDateString()} · {received}/{units} units received
                    {po.expected_date && ` · expected ${po.expected_date}`}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <div>
                    <p className="text-sm font-semibold">{formatMoney(ordered, po.currency)}</p>
                    <p className="text-xs text-neutral-500">
                      {po.currency === "USD" && `≈ ${formatNaira(toKobo(ordered, po.currency, Number(po.exchange_rate)))} · `}
                      {paid >= ordered ? "Paid" : `${formatMoney(ordered - paid, po.currency)} owed`}
                    </p>
                  </div>
                  <PurchaseOrderStatusBadge status={po.status} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
      <Pagination basePath="/staff/dashboard/purchase-orders" params={{ status, supplier }} page={page} total={count ?? 0} />

      <div className="mt-10">
        <SheetUpload
          title="Cost prices"
          description={
            <>
              {(uncosted ?? 0).toLocaleString()} published products have no cost price yet, so their profit
              can&apos;t be measured. Download the cost sheet, fill in <code>new_cost_ngn</code> with what you
              pay the supplier per unit (in naira), and upload it. Receiving a purchase order sets costs
              automatically from then on.
            </>
          }
          downloadHref="/staff/dashboard/purchase-orders/cost-sheet"
          downloadLabel="Download cost sheet"
          valueFormat="naira"
          previewAction={previewCostImport}
          applyAction={applyCostImport}
        />
      </div>
    </div>
  );
}
