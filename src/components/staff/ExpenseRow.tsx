"use client";

import { useState } from "react";
import { decideExpense, voidExpense } from "@/app/actions/staff-expenses";
import { formatNaira } from "@/lib/money";
import type { Expense } from "@/lib/staff";

export function ExpenseRow({ expense, isSuperAdmin }: { expense: Expense; isSuperAdmin: boolean }) {
  const [voiding, setVoiding] = useState(false);
  const voided = Boolean(expense.voided_at);

  return (
    <div className={`p-3 ${voided ? "bg-neutral-50" : ""}`}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className={`truncate text-sm font-medium ${voided ? "text-neutral-400 line-through" : ""}`}>
            {expense.description}
          </p>
          <p className="text-xs text-neutral-500">
            {expense.incurred_on}
            {expense.category ? ` · ${expense.category}` : ""}
            {expense.recorded_by_name ? ` · by ${expense.recorded_by_name}` : ""}
            {expense.receipt_path && (
              <>
                {" · "}
                <a href={`/staff/dashboard/expenses/${expense.id}/receipt`} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
                  receipt
                </a>
              </>
            )}
          </p>
          {voided && (
            <p className="text-xs text-red-600">
              Voided by {expense.voided_by_name}: {expense.void_reason}
            </p>
          )}
        </div>
        {!voided && expense.status === "pending_approval" && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Awaiting approval</span>
        )}
        {!voided && expense.status === "rejected" && (
          <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-medium text-neutral-600">Rejected</span>
        )}
        <span className={`shrink-0 text-sm font-semibold ${voided || expense.status !== "approved" ? "text-neutral-400" : ""}`}>
          {formatNaira(expense.amount_kobo)}
        </span>
        {!voided && expense.status === "pending_approval" && isSuperAdmin && (
          <form action={decideExpense} className="flex gap-1">
            <input type="hidden" name="id" value={expense.id} />
            <button name="decision" value="approve" className="rounded-full bg-brand-900 px-3 py-1 text-xs font-semibold text-white">
              Approve
            </button>
            <button name="decision" value="reject" className="rounded-full border border-neutral-300 px-3 py-1 text-xs font-medium">
              Reject
            </button>
          </form>
        )}
        {!voided && (
          <button type="button" onClick={() => setVoiding((v) => !v)} className="shrink-0 text-xs text-neutral-400 hover:text-red-600">
            {voiding ? "Keep" : "Void"}
          </button>
        )}
      </div>
      {voiding && (
        <form action={voidExpense} className="mt-2 flex flex-wrap gap-2">
          <input type="hidden" name="id" value={expense.id} />
          <input
            name="reason"
            required
            placeholder="Why is this being voided? (e.g. entered twice)"
            className="min-w-0 flex-1 rounded-md border border-neutral-300 px-2 py-1 text-xs"
          />
          <button type="submit" className="rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white">
            Void expense
          </button>
        </form>
      )}
    </div>
  );
}
