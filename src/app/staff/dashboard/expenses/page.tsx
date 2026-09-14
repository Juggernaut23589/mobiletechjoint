import { redirect } from "next/navigation";
import { getStaffSession } from "@/app/actions/staff-auth";
import { hasAbility } from "@/lib/staff-auth";
import { getExpenses } from "@/lib/staff";
import { formatNaira } from "@/lib/money";
import { ExpenseForm } from "@/components/staff/ExpenseForm";
import { deleteExpense } from "@/app/actions/staff-expenses";

export const dynamic = "force-dynamic";

export default async function StaffExpensesPage() {
  const session = await getStaffSession();
  if (!session || (session.role !== "super_admin" && !hasAbility(session, "manage_expenses"))) {
    redirect("/staff/dashboard?error=forbidden");
  }

  const expenses = await getExpenses();
  const total = expenses.reduce((sum, e) => sum + e.amount_kobo, 0);

  return (
    <div>
      <h1 className="font-display mb-1 text-2xl font-bold tracking-tight text-brand-900">Expenses</h1>
      <p className="mb-6 text-sm text-neutral-500">
        {expenses.length} recorded · {formatNaira(total)} total
      </p>

      <ExpenseForm />

      {expenses.length === 0 ? (
        <p className="text-sm text-neutral-500">No expenses recorded yet.</p>
      ) : (
        <div className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
          {expenses.map((expense) => (
            <form key={expense.id} action={deleteExpense} className="flex items-center justify-between gap-4 p-3">
              <input type="hidden" name="id" value={expense.id} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{expense.description}</p>
                <p className="text-xs text-neutral-500">
                  {expense.incurred_on} {expense.category ? `· ${expense.category}` : ""}
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold">{formatNaira(expense.amount_kobo)}</span>
              <button type="submit" className="shrink-0 text-xs text-neutral-400 hover:text-red-600">
                Remove
              </button>
            </form>
          ))}
        </div>
      )}
    </div>
  );
}
