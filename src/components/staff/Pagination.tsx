import Link from "next/link";
import { STAFF_PAGE_SIZE } from "@/lib/staff-query";

/** Prev/next links that keep every active filter in the URL. */
export function Pagination({
  basePath,
  params,
  page,
  total,
  pageSize = STAFF_PAGE_SIZE,
}: {
  basePath: string;
  params: Record<string, string | undefined>;
  page: number;
  total: number;
  pageSize?: number;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (pageCount <= 1) return null;

  const href = (p: number) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
    if (p > 1) qs.set("page", String(p));
    const s = qs.toString();
    return s ? `${basePath}?${s}` : basePath;
  };

  const linkClass =
    "rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50";
  const disabledClass =
    "rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-300";

  return (
    <div className="mt-4 flex items-center justify-between gap-3 text-xs text-neutral-500">
      <span>
        Page {page} of {pageCount} · {total.toLocaleString()} total
      </span>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={href(page - 1)} className={linkClass}>
            ← Previous
          </Link>
        ) : (
          <span className={disabledClass}>← Previous</span>
        )}
        {page < pageCount ? (
          <Link href={href(page + 1)} className={linkClass}>
            Next →
          </Link>
        ) : (
          <span className={disabledClass}>Next →</span>
        )}
      </div>
    </div>
  );
}
