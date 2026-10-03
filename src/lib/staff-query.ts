export const STAFF_PAGE_SIZE = 50;

export function parsePage(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isInteger(n) && n > 1 ? n : 1;
}

export function pageRange(page: number, pageSize = STAFF_PAGE_SIZE): [number, number] {
  const from = (page - 1) * pageSize;
  return [from, from + pageSize - 1];
}

/** Free-text search goes into PostgREST `or=(…ilike…)` filters, where
 *  commas, parentheses and wildcards are syntax — strip them so a search
 *  term can't break (or widen) the filter. */
export function sanitizeSearch(raw: string | undefined): string {
  return (raw ?? "").replace(/[,()*%\\:"]/g, " ").replace(/\s+/g, " ").trim().slice(0, 100);
}

export function isIsoDate(raw: string | undefined): raw is string {
  return !!raw && /^\d{4}-\d{2}-\d{2}$/.test(raw);
}
