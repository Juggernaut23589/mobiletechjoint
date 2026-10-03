import Link from "next/link";
import { redirect } from "next/navigation";
import { getStaffSession } from "@/app/actions/staff-auth";
import { hasAbility } from "@/lib/staff-auth";
import { getStockInsights, LEAD_TIME_DAYS, TARGET_COVER_DAYS, type ProductInsight } from "@/lib/stock-insights";
import { formatNaira } from "@/lib/money";

export const dynamic = "force-dynamic";

function Table({
  rows,
  columns,
  empty,
}: {
  rows: ProductInsight[];
  columns: { label: string; render: (p: ProductInsight) => React.ReactNode; right?: boolean }[];
  empty: string;
}) {
  if (rows.length === 0) return <p className="text-sm text-neutral-500">{empty}</p>;
  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wider text-neutral-400">
            <th className="px-3 py-2 font-medium">Product</th>
            {columns.map((c) => (
              <th key={c.label} className={`px-3 py-2 font-medium ${c.right ? "text-right" : ""}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {rows.map((p) => (
            <tr key={p.id}>
              <td className="max-w-xs px-3 py-2">
                <Link href={`/staff/dashboard/products/${p.id}/edit#stock-history`} className="block truncate hover:text-brand-700 hover:underline">
                  {p.name}
                </Link>
                {p.brand && <span className="text-xs text-neutral-400">{p.brand}</span>}
              </td>
              {columns.map((c) => (
                <td key={c.label} className={`px-3 py-2 ${c.right ? "text-right font-mono" : ""}`}>
                  {c.render(p)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function StockInsightsPage() {
  const session = await getStaffSession();
  if (!session || !hasAbility(session, "manage_inventory")) redirect("/staff/dashboard?error=forbidden");
  const showCost = hasAbility(session, "manage_purchasing") || hasAbility(session, "view_sales");

  const insights = await getStockInsights();
  const { products } = insights;
  const value = (p: ProductInsight) => Math.max(p.stock, 0) * (showCost && p.costKobo !== null ? p.costKobo : (p.priceKobo ?? 0));

  const reorder = products.filter((p) => p.suggestedReorder > 0).sort((a, b) => (a.daysOfCover ?? 0) - (b.daysOfCover ?? 0));
  const bestSellers = products.filter((p) => p.sold30 > 0).sort((a, b) => b.sold30 - a.sold30).slice(0, 20);
  const slow = products
    .filter((p) => p.stock > 0 && p.sold90 === 0)
    .sort((a, b) => value(b) - value(a));
  const slowValue = slow.reduce((s, p) => s + value(p), 0);

  return (
    <div>
      <h1 className="font-display mb-1 text-2xl font-bold tracking-tight text-brand-900">Stock insights</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Based on sales over the last 90 days, for published products. Reorder suggestions assume a{" "}
        {LEAD_TIME_DAYS}-day supplier lead time and aim to cover {TARGET_COVER_DAYS} days of sales on arrival.
      </p>

      <div className="mb-8 grid gap-4 sm:grid-cols-4">
        {[
          ...(showCost
            ? [{ label: "Stock value at cost", value: formatNaira(insights.stockValueCostKobo), sub: insights.uncostedWithStock ? `${insights.uncostedWithStock} stocked products have no cost yet` : null }]
            : []),
          { label: "Stock value at selling price", value: formatNaira(insights.stockValueRetailKobo), sub: null },
          { label: "Units on hand", value: insights.unitsOnHand.toLocaleString(), sub: null },
          { label: "Not sold in 90 days", value: `${slow.length} products`, sub: `${formatNaira(slowValue)} tied up` },
        ].map((c) => (
          <div key={c.label} className="rounded-lg border border-neutral-200 bg-white p-4">
            <p className="font-display text-xl font-bold text-brand-900">{c.value}</p>
            <p className="text-sm text-neutral-500">{c.label}</p>
            {c.sub && <p className="mt-1 text-xs text-neutral-400">{c.sub}</p>}
          </div>
        ))}
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">
        Reorder now ({reorder.length})
      </h2>
      <div className="mb-8">
        <Table
          rows={reorder}
          empty="Nothing needs reordering based on recent sales."
          columns={[
            { label: "In stock", render: (p) => p.stock, right: true },
            { label: "Sold (90d)", render: (p) => p.sold90, right: true },
            { label: "Days left", render: (p) => p.daysOfCover ?? "—", right: true },
            { label: "Suggested order", render: (p) => <strong>{p.suggestedReorder}</strong>, right: true },
          ]}
        />
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">Best sellers (30 days)</h2>
      <div className="mb-8">
        <Table
          rows={bestSellers}
          empty="No sales in the last 30 days yet."
          columns={[
            { label: "Sold (30d)", render: (p) => p.sold30, right: true },
            { label: "In stock", render: (p) => p.stock, right: true },
            { label: "Sell-through", render: (p) => (p.sellThrough30 === null ? "—" : `${Math.round(p.sellThrough30 * 100)}%`), right: true },
            { label: "Days left", render: (p) => p.daysOfCover ?? "—", right: true },
          ]}
        />
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">
        Slow movers — in stock, no sales in 90 days ({slow.length})
      </h2>
      <p className="mb-3 text-xs text-neutral-500">
        Candidates for a promotion or a discount code. Biggest value tied up first; top 50 shown. Value is
        {showCost ? " at cost where known, otherwise at selling price" : " at selling price"}.
      </p>
      <Table
        rows={slow.slice(0, 50)}
        empty="Every stocked product has sold in the last 90 days."
        columns={[
          { label: "In stock", render: (p) => p.stock, right: true },
          { label: "Value", render: (p) => formatNaira(value(p)), right: true },
          { label: "Last sold", render: (p) => (p.lastSoldAt ? new Date(p.lastSoldAt).toLocaleDateString() : "Never"), right: true },
        ]}
      />
    </div>
  );
}
