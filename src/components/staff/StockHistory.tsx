import Link from "next/link";
import { STOCK_REASON_LABELS } from "@/lib/stock-labels";
import type { StockMovement } from "@/types/database";

export function StockHistory({ movements }: { movements: StockMovement[] }) {
  if (movements.length === 0) {
    return <p className="text-sm text-neutral-500">No stock movements recorded yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wider text-neutral-400">
            <th className="px-3 py-2 font-medium">When</th>
            <th className="px-3 py-2 font-medium">Reason</th>
            <th className="px-3 py-2 text-right font-medium">Change</th>
            <th className="px-3 py-2 text-right font-medium">Stock after</th>
            <th className="px-3 py-2 font-medium">By</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {movements.map((m) => (
            <tr key={m.id}>
              <td className="whitespace-nowrap px-3 py-2 text-xs text-neutral-500">
                {new Date(m.created_at).toLocaleString()}
              </td>
              <td className="px-3 py-2">
                {STOCK_REASON_LABELS[m.reason]}
                {m.order_id && (
                  <Link href={`/staff/dashboard/orders/${m.order_id}`} className="ml-1 text-xs text-brand-600 hover:underline">
                    (order)
                  </Link>
                )}
                {m.note && <span className="block text-xs text-neutral-400">{m.note}</span>}
              </td>
              <td className={`px-3 py-2 text-right font-mono ${m.delta > 0 ? "text-green-700" : "text-red-600"}`}>
                {m.delta > 0 ? "+" : ""}
                {m.delta}
              </td>
              <td className="px-3 py-2 text-right font-mono">{m.quantity_after}</td>
              <td className="px-3 py-2 text-xs text-neutral-500">{m.staff_name ?? "System"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
