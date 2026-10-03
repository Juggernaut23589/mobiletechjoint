import Link from "next/link";
import { redirect } from "next/navigation";
import { getStaffSession } from "@/app/actions/staff-auth";
import { hasAbility } from "@/lib/staff-auth";
import { getProfitAndLoss, PERIOD_PRESETS, resolvePeriod, type MarginRow } from "@/lib/finance";
import { formatNaira } from "@/lib/money";

export const dynamic = "force-dynamic";

const GROUPS = [
  { value: "product", label: "By product" },
  { value: "brand", label: "By brand" },
  { value: "category", label: "By category" },
];

function Line({
  label,
  kobo,
  sign,
  strong,
  indent,
  note,
}: {
  label: string;
  kobo: number;
  sign?: "+" | "−";
  strong?: boolean;
  indent?: boolean;
  note?: string;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-4 px-4 py-2 ${strong ? "border-t border-neutral-200 font-semibold text-brand-900" : "text-neutral-700"} ${indent ? "pl-8 text-xs text-neutral-500" : "text-sm"}`}
    >
      <span>
        {label}
        {note && <span className="ml-2 text-xs font-normal text-neutral-400">{note}</span>}
      </span>
      <span className={`font-mono ${kobo < 0 && strong ? "text-red-600" : ""}`}>
        {sign ? `${sign} ` : ""}
        {formatNaira(Math.abs(kobo))}
        {kobo < 0 && !sign ? " loss" : ""}
      </span>
    </div>
  );
}

function marginPct(row: MarginRow): string {
  if (row.uncostedUnits === row.units) return "no cost set";
  if (row.uncostedUnits > 0) return "partly costed";
  if (row.salesKobo <= 0) return "—";
  return `${(((row.salesKobo - row.cogsKobo) / row.salesKobo) * 100).toFixed(1)}%`;
}

export default async function StaffFinancePage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string; group?: string }>;
}) {
  const session = await getStaffSession();
  if (!session || !hasAbility(session, "view_sales")) redirect("/staff/dashboard?error=forbidden");

  const params = await searchParams;
  const period = resolvePeriod(params.period, params.from, params.to);
  const group = GROUPS.some((g) => g.value === params.group) ? params.group! : "product";
  const pnl = await getProfitAndLoss(period);
  const rows = (group === "brand" ? pnl.byBrand : group === "category" ? pnl.byCategory : pnl.byProduct).slice(0, 25);
  const maxDaily = Math.max(...pnl.daily.map((d) => d.netKobo), 1);
  const periodQs = `from=${period.from}&to=${period.to}`;

  return (
    <div>
      <h1 className="font-display mb-1 text-2xl font-bold tracking-tight text-brand-900">Finance</h1>
      <p className="mb-5 text-sm text-neutral-500">
        Profit &amp; loss for {period.label} ({period.from} to {period.to}). Sales count on the day payment
        was confirmed; stock purchases only become a cost when the item is sold.
      </p>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {PERIOD_PRESETS.map((p) => (
          <Link
            key={p.value}
            href={`/staff/dashboard/sales?period=${p.value}&group=${group}`}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              period.label === p.label ? "bg-brand-900 text-white" : "border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
            }`}
          >
            {p.label}
          </Link>
        ))}
        <form className="flex flex-wrap items-center gap-1 text-xs text-neutral-500">
          <input type="hidden" name="group" value={group} />
          <input name="from" type="date" defaultValue={period.from} className="rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm" />
          to
          <input name="to" type="date" defaultValue={period.to} className="rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm" />
          <button type="submit" className="rounded-full border border-neutral-300 bg-white px-3 py-1.5 font-semibold text-neutral-700">
            Apply
          </button>
        </form>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        {[
          { label: "Net profit", value: formatNaira(pnl.netProfitKobo), tone: pnl.netProfitKobo >= 0 ? "text-green-700" : "text-red-600" },
          { label: "Gross margin", value: pnl.grossMarginPct === null ? "—" : `${pnl.grossMarginPct.toFixed(1)}%`, tone: "text-brand-900" },
          { label: "Orders", value: pnl.orderCount.toLocaleString(), tone: "text-brand-900" },
          {
            label: "Average order",
            value: pnl.orderCount ? formatNaira(Math.round((pnl.productSalesKobo + pnl.deliveryFeesKobo) / pnl.orderCount)) : "—",
            tone: "text-brand-900",
          },
        ].map((c) => (
          <div key={c.label} className="rounded-lg border border-neutral-200 bg-white p-4">
            <p className={`font-display text-2xl font-bold ${c.tone}`}>{c.value}</p>
            <p className="text-sm text-neutral-500">{c.label}</p>
          </div>
        ))}
      </div>

      {pnl.uncostedUnits > 0 && (
        <p className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {pnl.uncostedUnits} unit(s) sold — {formatNaira(pnl.uncostedSalesKobo)} of sales — had no cost price
          recorded, so cost of goods is understated and profit overstated. Set cost prices under{" "}
          <Link href="/staff/dashboard/purchase-orders" className="font-semibold underline">
            Purchasing
          </Link>
          .
        </p>
      )}

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-neutral-200 bg-white py-2">
          <Line label="Product sales" kobo={pnl.productSalesKobo} note={`${pnl.unitsSold} units`} />
          <Line label="Refunds" kobo={pnl.refundsKobo} sign="−" />
          <Line label="Net sales" kobo={pnl.netSalesKobo} strong />
          <Line label="Cost of goods sold" kobo={pnl.cogsKobo} sign="−" />
          <Line
            label="Gross profit"
            kobo={pnl.grossProfitKobo}
            strong
            note={pnl.grossMarginPct === null ? undefined : `${pnl.grossMarginPct.toFixed(1)}% margin`}
          />
          <Line label="Delivery fees collected" kobo={pnl.deliveryFeesKobo} sign="+" />
          <Line label="Paystack fees" kobo={pnl.paymentFeesKobo} sign="−" />
          <Line label="Operating expenses" kobo={pnl.expensesKobo} sign="−" />
          {pnl.expensesByCategory.map((e) => (
            <Line key={e.category} label={e.category} kobo={e.kobo} indent />
          ))}
          <Line label="Net profit" kobo={pnl.netProfitKobo} strong />
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">
            Net takings by day
          </h2>
          {pnl.daily.length === 0 ? (
            <p className="text-sm text-neutral-500">No paid orders in this period.</p>
          ) : (
            <div className="flex max-h-80 flex-col gap-2 overflow-y-auto rounded-lg border border-neutral-200 bg-white p-4">
              {pnl.daily.map((day) => (
                <div key={day.date} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-xs text-neutral-500">{day.date}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className="h-full bg-brand-gradient"
                      style={{ width: `${Math.max((Math.max(day.netKobo, 0) / maxDaily) * 100, 2)}%` }}
                    />
                  </div>
                  <span className="w-24 shrink-0 text-right text-xs font-medium">{formatNaira(day.netKobo)}</span>
                </div>
              ))}
            </div>
          )}

          <h2 className="mb-3 mt-6 text-sm font-semibold uppercase tracking-wider text-neutral-500">
            Export for your accountant
          </h2>
          <div className="flex flex-wrap gap-2">
            {[
              { type: "orders", label: "Sales register" },
              { type: "expenses", label: "Expenses" },
              { type: "purchases", label: "Purchase orders" },
            ].map((x) => (
              <a
                key={x.type}
                href={`/staff/dashboard/sales/export?type=${x.type}&${periodQs}`}
                className="rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                {x.label} (CSV)
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="mr-2 text-sm font-semibold uppercase tracking-wider text-neutral-500">Margins</h2>
        {GROUPS.map((g) => (
          <Link
            key={g.value}
            href={`/staff/dashboard/sales?${periodQs}&group=${g.value}`}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              group === g.value ? "bg-brand-900 text-white" : "border border-neutral-300 bg-white text-neutral-700"
            }`}
          >
            {g.label}
          </Link>
        ))}
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-neutral-500">No sales in this period.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wider text-neutral-400">
                <th className="px-3 py-2 font-medium">{GROUPS.find((g) => g.value === group)!.label.replace("By ", "")}</th>
                <th className="px-3 py-2 text-right font-medium">Units</th>
                <th className="px-3 py-2 text-right font-medium">Sales</th>
                <th className="px-3 py-2 text-right font-medium">Cost</th>
                <th className="px-3 py-2 text-right font-medium">Gross profit</th>
                <th className="px-3 py-2 text-right font-medium">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((r) => (
                <tr key={r.key}>
                  <td className="max-w-xs truncate px-3 py-2">{r.key}</td>
                  <td className="px-3 py-2 text-right font-mono">{r.units}</td>
                  <td className="px-3 py-2 text-right font-mono">{formatNaira(r.salesKobo)}</td>
                  <td className="px-3 py-2 text-right font-mono">{formatNaira(r.cogsKobo)}</td>
                  <td className="px-3 py-2 text-right font-mono">{formatNaira(r.salesKobo - r.cogsKobo)}</td>
                  <td className="px-3 py-2 text-right text-xs">{marginPct(r)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
