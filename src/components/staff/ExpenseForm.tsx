"use client";

import { useActionState } from "react";
import { addExpense } from "@/app/actions/staff-expenses";

export function ExpenseForm() {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string }, formData: FormData) => (await addExpense(formData)) ?? {},
    {}
  );

  return (
    <form action={formAction} className="mb-6 rounded-lg border border-neutral-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">
        Record an expense
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-neutral-500">Description</label>
          <input
            name="description"
            required
            placeholder="e.g. Warehouse rent, delivery fuel, packaging"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-500">Amount (₦)</label>
          <input
            name="amountNaira"
            type="number"
            min={1}
            required
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-500">Category (optional)</label>
          <input
            name="category"
            placeholder="e.g. Logistics, Rent, Supplies"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-500">Date</label>
          <input
            name="incurredOn"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {state.error && <p className="mt-3 text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-3 rounded-full bg-brand-gradient px-4 py-2 text-sm font-semibold text-white shadow-glow disabled:opacity-50"
      >
        {pending ? "Saving…" : "Add expense"}
      </button>
    </form>
  );
}
