import { redirect } from "next/navigation";
import { getStaffSession } from "@/app/actions/staff-auth";
import { hasAbility } from "@/lib/staff-auth";
import { createServiceClient } from "@/lib/supabase/server";
import { formatMoney, type Currency } from "@/lib/money";
import { SupplierForm } from "@/components/staff/SupplierForm";
import { SupplierRow } from "@/components/staff/SupplierRow";
import type { Supplier } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const session = await getStaffSession();
  if (!session || !hasAbility(session, "manage_purchasing")) redirect("/staff/dashboard?error=forbidden");

  const supabase = createServiceClient();
  const [{ data: suppliers }, { data: orders }] = await Promise.all([
    supabase.from("suppliers").select("*").order("is_active", { ascending: false }).order("name"),
    supabase
      .from("purchase_orders")
      .select("supplier_id, status, currency, purchase_order_items(quantity_ordered, unit_cost_minor), purchase_order_payments(amount_minor)")
      .neq("status", "cancelled")
      .returns<
        {
          supplier_id: string;
          status: string;
          currency: Currency;
          purchase_order_items: { quantity_ordered: number; unit_cost_minor: number }[];
          purchase_order_payments: { amount_minor: number }[];
        }[]
      >(),
  ]);

  const stats = new Map<string, { openOrders: number; owed: Partial<Record<Currency, number>> }>();
  for (const po of orders ?? []) {
    const s = stats.get(po.supplier_id) ?? { openOrders: 0, owed: {} };
    if (po.status === "ordered" || po.status === "partially_received") s.openOrders++;
    const total = po.purchase_order_items.reduce((sum, i) => sum + i.quantity_ordered * i.unit_cost_minor, 0);
    const paid = po.purchase_order_payments.reduce((sum, p) => sum + p.amount_minor, 0);
    if (po.status !== "draft" && total > paid) s.owed[po.currency] = (s.owed[po.currency] ?? 0) + total - paid;
    stats.set(po.supplier_id, s);
  }
  const owedText = (owed: Partial<Record<Currency, number>>) => {
    const parts = (Object.entries(owed) as [Currency, number][]).map(([c, v]) => formatMoney(v, c));
    return parts.length ? parts.join(" + ") : null;
  };

  const list = (suppliers ?? []) as Supplier[];

  return (
    <div>
      <h1 className="font-display mb-1 text-2xl font-bold tracking-tight text-brand-900">Suppliers</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Local distributors and importers you buy stock from. &quot;Owed&quot; is what&apos;s still unpaid on orders
        that have been placed.
      </p>

      <details className="mb-6 rounded-lg border border-neutral-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-semibold text-neutral-900">Add a supplier</summary>
        <div className="mt-3">
          <SupplierForm />
        </div>
      </details>

      {list.length === 0 ? (
        <p className="text-sm text-neutral-500">No suppliers yet.</p>
      ) : (
        <div className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
          {list.map((s) => {
            const st = stats.get(s.id);
            return (
              <SupplierRow
                key={s.id}
                supplier={s}
                stats={{ openOrders: st?.openOrders ?? 0, outstanding: st ? owedText(st.owed) : null }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
