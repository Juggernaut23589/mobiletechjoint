"use client";

import { useActionState } from "react";
import { addExpense } from "@/app/actions/staff-expenses";
import { EXPENSE_CATEGORIES } from "@/lib/expenses";

const input = "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm";

export function ExpenseForm({ approvalNote }: { approvalNote: string | null }) {
  const [state, formAction, pending] = useActionState(addExpense, {});

  return (
    <form action={formAction} className="mb-6 rounded-lg border border-neutral-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">
        Record an expense
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-neutral-500">Description</label>
          <input name="description" required placeholder="e.g. Warehouse rent for October" className={input} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-500">Amount (₦)</label>
          <input name="amountNaira" type="number" min={1} step="0.01" required className={input} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-500">Category</label>
          <input name="category" list="expense-categories" required placeholder="Pick or type a category" className={input} />
          <datalist id="expense-categories">
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-500">Date</label>
          <input name="incurredOn" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className={input} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-500">Receipt (photo or PDF, optional)</label>
          <input name="receipt" type="file" accept="image/*,application/pdf" className="w-full text-sm" />
        </div>
      </div>

      {approvalNote && <p className="mt-3 text-xs text-neutral-500">{approvalNote}</p>}
      {state.error && <p className="mt-3 text-sm text-red-600">{state.error}</p>}
      {state.notice && <p className="mt-3 text-sm text-green-700">{state.notice}</p>}

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
