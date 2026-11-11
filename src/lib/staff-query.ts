export const STAFF_PAGE_SIZE = 50;

export function parsePage(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isInteger(n) && n > 1 ? n : 1;
}

export function pageRange(page: number, pageSize = STAFF_PAGE_SIZE): [number, number] {
  const from = (page - 1) * pageSize;
  return [from, from + pageSize - 1];
}

export function sanitizeSearch(raw: string | undefined): string {
  return (raw ?? "").trim().slice(0, 100);
}

/** Builds a PostgREST `or=(…)` ilike filter across several columns, safely
 *  quoting the value when it contains `,` or `(`/`)` — those characters are
 *  `.or()` filter syntax, not SQL, so stripping them (as a previous version
 *  of this helper did) made terms like "Lens (Canon RF)" never match the
 *  stored name, which still contains the parentheses. Quoting instead of
 *  stripping keeps the search term intact. */
export function orIlikeFilter(columns: string[], q: string): string {
  const pattern = `%${q}%`;
  const value = /[,()]/.test(pattern)
    ? `"${pattern.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
    : pattern;
  return columns.map((c) => `${c}.ilike.${value}`).join(",");
}

export function isIsoDate(raw: string | undefined): raw is string {
  return !!raw && /^\d{4}-\d{2}-\d{2}$/.test(raw);
}
