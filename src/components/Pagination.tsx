import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Prev / numbered / Next pagination. Collapses long ranges to
 *  1 … 4 5 6 … 20 so a brand with hundreds of products doesn't render
 *  thirty page buttons. */
export function Pagination({
  page,
  totalPages,
  hrefFor,
}: {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const pages: (number | "gap")[] = [];
  for (let p = 1; p <= totalPages; p++) {
    const nearCurrent = Math.abs(p - page) <= 1;
    if (p === 1 || p === totalPages || nearCurrent) {
      pages.push(p);
    } else if (pages[pages.length - 1] !== "gap") {
      pages.push("gap");
    }
  }

  const btn =
    "flex h-10 min-w-10 items-center justify-center rounded-full border px-3 text-[13px] font-semibold transition-colors";
  const idle = "border-neutral-200 bg-white text-neutral-900 hover:border-brand-900 hover:bg-brand-900 hover:text-white";
  const disabled = "pointer-events-none border-neutral-200 bg-white text-neutral-300";

  return (
    <nav aria-label="Pagination" className="mt-10 flex flex-wrap items-center justify-center gap-2">
      <Link
        href={hrefFor(page - 1)}
        aria-disabled={page <= 1}
        className={`${btn} ${page <= 1 ? disabled : idle}`}
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="sr-only">Previous</span>
      </Link>

      {pages.map((p, i) =>
        p === "gap" ? (
          <span key={`gap-${i}`} className="px-1 text-neutral-400">
            …
          </span>
        ) : (
          <Link
            key={p}
            href={hrefFor(p)}
            aria-current={p === page ? "page" : undefined}
            className={`${btn} ${
              p === page ? "border-brand-900 bg-brand-900 text-white" : idle
            }`}
          >
            {p}
          </Link>
        )
      )}

      <Link
        href={hrefFor(page + 1)}
        aria-disabled={page >= totalPages}
        className={`${btn} ${page >= totalPages ? disabled : idle}`}
      >
        <span className="sr-only">Next</span>
        <ChevronRight className="h-4 w-4" />
      </Link>
    </nav>
  );
}
