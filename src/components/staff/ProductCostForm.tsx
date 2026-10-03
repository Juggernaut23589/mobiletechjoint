"use client";

import { useActionState } from "react";
import { setProductCost } from "@/app/actions/staff-purchasing";
import { formatNaira } from "@/lib/money";

export function ProductCostForm({
  productId,
  costKobo,
  priceKobo,
}: {
  productId: string;
  costKobo: number | null;
  priceKobo: number | null;
}) {
  const [state, formAction, pending] = useActionState(setProductCost, {});
  const margin =
    costKobo !== null && priceKobo ? (((priceKobo - costKobo) / priceKobo) * 100).toFixed(1) : null;

  return (
    <form action={formAction} className="rounded-lg border border-neutral-200 bg-white p-4 text-sm">
      <input type="hidden" name="productId" value={productId} />
      <p className="mb-1 font-medium text-neutral-900">Cost price</p>
      <p className="mb-3 text-xs text-neutral-500">
        Average unit cost, updated automatically when purchase orders are received. Only staff with
        Purchasing access can see this.
        {costKobo !== null && priceKobo ? ` Selling at ${formatNaira(priceKobo)} gives a ${margin}% margin.` : ""}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-neutral-500">₦</span>
        <input
          name="costNaira"
          type="number"
          min={0}
          step="0.01"
          defaultValue={costKobo === null ? "" : costKobo / 100}
          placeholder="Not set"
          className="w-40 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <button type="submit" disabled={pending} className="rounded-full bg-brand-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
          {pending ? "Saving…" : "Save cost"}
        </button>
        {state.error && <span className="text-xs text-red-600">{state.error}</span>}
        {state.notice && <span className="text-xs text-green-700">{state.notice}</span>}
      </div>
    </form>
  );
}
