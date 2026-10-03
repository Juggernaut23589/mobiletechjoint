import { createServiceClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { parseCsv } from "@/lib/csv";

export interface SheetChange {
  id: string;
  slug: string;
  name: string;
  from: number | null;
  to: number;
}

export interface SheetPreview {
  error?: string;
  changes: SheetChange[];
  unchangedCount: number;
  blankCount: number;
  unknownSlugs: string[];
  invalidRows: { row: number; slug: string; value: string }[];
}

export const EMPTY_SHEET_PREVIEW: SheetPreview = {
  changes: [],
  unchangedCount: 0,
  blankCount: 0,
  unknownSlugs: [],
  invalidRows: [],
};

/** Reads a product sheet keyed by `slug` and compares one value column
 *  against the product's current value. Blank cells mean "leave alone",
 *  so a partially-filled sheet is always safe to upload. `parse` turns the
 *  cell text into the stored value, or null if it's invalid. */
export async function analyseProductSheet(
  csvText: string,
  options: {
    valueColumn: string;
    field: "stock_quantity" | "cost_kobo";
    parse: (raw: string) => number | null;
  }
): Promise<SheetPreview> {
  const rows = parseCsv(csvText);
  if (rows.length < 2) return { ...EMPTY_SHEET_PREVIEW, error: "The file has no data rows." };

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const slugCol = header.indexOf("slug");
  const valueCol = header.indexOf(options.valueColumn);
  if (slugCol === -1 || valueCol === -1) {
    return {
      ...EMPTY_SHEET_PREVIEW,
      error: `The file needs "slug" and "${options.valueColumn}" columns — start from the downloaded sheet.`,
    };
  }

  const products = await fetchAll<{ id: string; slug: string; name: string; value: number | null }>(
    (from, to) =>
      createServiceClient()
        .from("products")
        .select(`id, slug, name, value:${options.field}`)
        .order("id")
        .range(from, to)
        .returns<{ id: string; slug: string; name: string; value: number | null }[]>()
  );
  const bySlug = new Map(products.map((p) => [p.slug, p]));

  const preview: SheetPreview = { ...EMPTY_SHEET_PREVIEW, changes: [], unknownSlugs: [], invalidRows: [] };
  const seen = new Set<string>();

  rows.slice(1).forEach((row, i) => {
    const slug = (row[slugCol] ?? "").trim();
    const raw = (row[valueCol] ?? "").trim();
    if (!slug) return;
    if (raw === "") {
      preview.blankCount++;
      return;
    }
    const value = options.parse(raw);
    if (value === null) {
      preview.invalidRows.push({ row: i + 2, slug, value: raw });
      return;
    }
    const product = bySlug.get(slug);
    if (!product) {
      preview.unknownSlugs.push(slug);
      return;
    }
    if (seen.has(slug)) {
      preview.invalidRows.push({ row: i + 2, slug, value: `${raw} (duplicate row)` });
      return;
    }
    seen.add(slug);
    if (product.value === value) {
      preview.unchangedCount++;
      return;
    }
    preview.changes.push({ id: product.id, slug, name: product.name, from: product.value, to: value });
  });

  return preview;
}

export function parseWholeNumber(raw: string): number | null {
  const n = Number(raw.replace(/,/g, ""));
  return Number.isInteger(n) && n >= 0 ? n : null;
}

/** Naira amount (commas allowed, up to 2 decimals) → kobo. */
export function parseNairaToKobo(raw: string): number | null {
  const n = Number(raw.replace(/[₦,\s]/g, ""));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}
