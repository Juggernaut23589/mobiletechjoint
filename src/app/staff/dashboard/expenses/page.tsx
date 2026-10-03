import Link from "next/link";
import { redirect } from "next/navigation";
import { getStaffSession } from "@/app/actions/staff-auth";
import { hasAbility } from "@/lib/staff-auth";
import { getExpenses } from "@/lib/staff";
import { formatNaira } from "@/lib/money";
import { EXPENSE_APPROVAL_LIMIT_KOBO } from "@/lib/expenses";
import { PERIOD_PRESETS, resolvePeriod } from "@/lib/finance";
import { pageRange, parsePage } from "@/lib/staff-query";
import { ExpenseForm } from "@/components/staff/ExpenseForm";
import { ExpenseRow } from "@/components/staff/ExpenseRow";
import { Pagination } from "@/components/staff/Pagination";

export const dynamic = "force-dynamic";

export default async function StaffExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string; page?: string }>;
}) {
  const session = await getStaffSession();
  if (!session || !hasAbility(session, "manage_expenses")) redirect("/staff/dashboard?error=forbidden");

  const params = await searchParams;
  const period = resolvePeriod(params.period ?? "this_month", params.from, params.to);
  const page = parsePage(params.page);
  const [rangeFrom, rangeTo] = pageRange(page);
  const { expenses, total } = await getExpenses({ from: period.from, to: period.to, rangeFrom, rangeTo });
  const isSuper = session.role === "super_admin";

  const counted = expenses.filter((e) => e.status === "approved" && !e.voided_at);
  const pending = expenses.filter((e) => e.status === "pending_approval" && !e.voided_at);

  return (
    <div>
      <h1 className="font-display mb-1 text-2xl font-bold tracking-tight text-brand-900">Expenses</h1>
      <p className="mb-6 text-sm text-neutral-500">
        {period.label}: {formatNaira(counted.reduce((s, e) => s + e.amount_kobo, 0))} approved on this page
        {pending.length > 0 && ` · ${pending.length} awaiting approval`}. Mistakes are voided, never deleted, so
        the books keep a full record.
      </p>

      <ExpenseForm
        approvalNote={
          isSuper ? null : `Expenses over ${formatNaira(EXPENSE_APPROVAL_LIMIT_KOBO)} wait for a super admin's approval before they count.`
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {PERIOD_PRESETS.map((p) => (
          <Link
            key={p.value}
            href={`/staff/dashboard/expenses?period=${p.value}`}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              period.label === p.label ? "bg-brand-900 text-white" : "border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
            }`}
          >
            {p.label}
          </Link>
        ))}
      </div>

      {expenses.length === 0 ? (
        <p className="text-sm text-neutral-500">No expenses recorded in this period.</p>
      ) : (
        <div className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
          {expenses.map((expense) => (
            <ExpenseRow key={expense.id} expense={expense} isSuperAdmin={isSuper} />
          ))}
        </div>
      )}
      <Pagination
        basePath="/staff/dashboard/expenses"
        params={{ from: period.from, to: period.to }}
        page={page}
        total={total}
      />
    </div>
  );
}
