"use client";

import { useActionState, useState } from "react";
import { createPurchaseOrder } from "@/app/actions/staff-purchasing";
import { ProductPicker } from "@/components/staff/ProductPicker";
import { formatMoney, type Currency } from "@/lib/money";

interface SupplierOption {
  id: string;
  name: string;
  currency: Currency;
}

interface Line {
  productId: string;
  name: string;
  quantity: string;
  unitCost: string;
}

const input = "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm";

export function PurchaseOrderForm({ suppliers }: { suppliers: SupplierOption[] }) {
  const [state, formAction, pending] = useActionState(createPurchaseOrder, {});
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? "");
  const [currency, setCurrency] = useState<Currency>(suppliers[0]?.currency ?? "NGN");
  const [lines, setLines] = useState<Line[]>([]);

  const toMinor = (v: string) => Math.round((Number(v.replace(/,/g, "")) || 0) * 100);
  const total = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * toMinor(l.unitCost), 0);
  const update = (i: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input
        type="hidden"
        name="lines"
        value={JSON.stringify(lines.map((l) => ({ productId: l.productId, quantity: Number(l.quantity), unitCost: l.unitCost })))}
      />

      <div className="grid gap-3 rounded-lg border border-neutral-200 bg-white p-4 sm:grid-cols-2">
        <label className="text-xs text-neutral-500">
          Supplier
          <select
            name="supplierId"
            value={supplierId}
            onChange={(e) => {
              setSupplierId(e.target.value);
              const s = suppliers.find((x) => x.id === e.target.value);
              if (s) setCurrency(s.currency);
            }}
            className={input}
          >
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-neutral-500">
          Currency
          <select name="currency" value={currency} onChange={(e) => setCurrency(e.target.value as Currency)} className={input}>
            <option value="NGN">Naira (₦)</option>
            <option value="USD">US dollar ($)</option>
          </select>
        </label>
        {currency === "USD" && (
          <label className="text-xs text-neutral-500">
            Exchange rate (₦ per $1)
            <input name="exchangeRate" type="number" step="0.0001" min="0" required placeholder="e.g. 1550" className={input} />
            <span className="mt-1 block text-[11px] text-neutral-400">
              You can update this to the rate you actually paid when the goods arrive.
            </span>
          </label>
        )}
        <label className="text-xs text-neutral-500">
          Expected delivery (optional)
          <input name="expectedDate" type="date" className={input} />
        </label>
        <label className="text-xs text-neutral-500 sm:col-span-2">
          Notes (optional)
          <textarea name="notes" rows={2} className={input} />
        </label>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <p className="mb-3 text-sm font-semibold text-neutral-900">Products</p>
        <ProductPicker
          excludeIds={lines.map((l) => l.productId)}
          onPick={(p) => setLines((ls) => [...ls, { productId: p.id, name: p.name, quantity: "1", unitCost: "" }])}
        />
        {lines.length > 0 && (
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-neutral-400">
                <th className="py-1 font-medium">Product</th>
                <th className="w-24 py-1 font-medium">Qty</th>
                <th className="w-36 py-1 font-medium">Unit cost ({currency === "USD" ? "$" : "₦"})</th>
                <th className="w-32 py-1 text-right font-medium">Line total</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {lines.map((l, i) => (
                <tr key={l.productId}>
                  <td className="py-2 pr-2">{l.name}</td>
                  <td className="py-2 pr-2">
                    <input
                      type="number"
                      min={1}
                      value={l.quantity}
                      onChange={(e) => update(i, { quantity: e.target.value })}
                      className="w-20 rounded border border-neutral-300 px-2 py-1"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={l.unitCost}
                      onChange={(e) => update(i, { unitCost: e.target.value })}
                      className="w-32 rounded border border-neutral-300 px-2 py-1"
                    />
                  </td>
                  <td className="py-2 text-right font-mono">
                    {formatMoney((Number(l.quantity) || 0) * toMinor(l.unitCost), currency)}
                  </td>
                  <td className="py-2 text-right">
                    <button
                      type="button"
                      onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}
                      className="text-xs text-neutral-400 hover:text-red-600"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="pt-3 text-right text-sm font-semibold">
                  Total
                </td>
                <td className="pt-3 text-right font-mono font-semibold">{formatMoney(total, currency)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {state.error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}

      <button
        type="submit"
        disabled={pending || lines.length === 0}
        className="self-start rounded-full bg-brand-gradient px-5 py-2 text-sm font-semibold text-white shadow-glow disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create draft purchase order"}
      </button>
    </form>
  );
}
