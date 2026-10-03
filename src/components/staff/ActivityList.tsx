import Link from "next/link";

export interface ActivityRow {
  id: string;
  staff_name: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  summary: string;
  changes: unknown;
  created_at: string;
}

function entityHref(row: ActivityRow): string | null {
  if (!row.entity_id) return null;
  if (row.entity_type === "product") return `/staff/dashboard/products/${row.entity_id}/edit`;
  if (row.entity_type === "order") return `/staff/dashboard/orders/${row.entity_id}`;
  return null;
}

export function ActivityList({ rows, emptyText }: { rows: ActivityRow[]; emptyText: string }) {
  if (rows.length === 0) return <p className="text-sm text-neutral-500">{emptyText}</p>;

  return (
    <div className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
      {rows.map((row) => {
        const href = entityHref(row);
        return (
          <div key={row.id} className="flex flex-wrap items-start gap-x-4 gap-y-1 p-3 text-sm">
            <span className="w-36 shrink-0 text-xs text-neutral-400">
              {new Date(row.created_at).toLocaleString()}
            </span>
            <span className="w-32 shrink-0 truncate text-xs font-semibold text-neutral-700">
              {row.staff_name}
            </span>
            <div className="min-w-0 flex-1">
              {href ? (
                <Link href={href} className="text-neutral-900 hover:text-brand-700 hover:underline">
                  {row.summary}
                </Link>
              ) : (
                <span className="text-neutral-900">{row.summary}</span>
              )}
              {row.changes != null && (
                <details className="mt-1">
                  <summary className="cursor-pointer text-xs text-neutral-400">Details</summary>
                  <pre className="mt-1 overflow-x-auto rounded bg-neutral-50 p-2 text-[11px] text-neutral-600">
                    {JSON.stringify(row.changes, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
