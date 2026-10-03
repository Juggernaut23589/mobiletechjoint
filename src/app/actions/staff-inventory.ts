"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { requireStaffAbility } from "@/lib/staff-session";
import { logStaffActivity, logStaffActivities } from "@/lib/activity-log";
import { parseCsv } from "@/lib/csv";
import { changeStock, MANUAL_STOCK_REASONS, STOCK_REASON_LABELS } from "@/lib/stock";
import type { StaffSession } from "@/lib/staff-auth";
import type { StockReason } from "@/types/database";

/** Deliberately separate from updateProductDetails (admin-products.ts) —
 *  "manage_inventory" is its own grantable ability, distinct from
 *  "manage_products" (editing images/description/etc), per the explicit
 *  requirement that these be independently assignable. Every change is
 *  recorded in stock_movements with the reason the staff member picked. */
export async function updateStockQuantity(formData: FormData): Promise<{ error?: string }> {
  let actor: StaffSession;
  try {
    actor = await requireStaffAbility("manage_inventory");
  } catch {
    return { error: "Forbidden." };
  }

  const productId = formData.get("productId") as string;
  const stockQuantity = Number(formData.get("stockQuantity"));
  const reason = formData.get("reason") as StockReason;
  const note = String(formData.get("note") ?? "").trim() || null;
  if (!productId) return { error: "Missing product." };
  if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
    return { error: "Enter a valid stock quantity." };
  }
  if (!MANUAL_STOCK_REASONS.includes(reason)) return { error: "Choose a reason for the change." };

  const { data: product } = await createServiceClient()
    .from("products")
    .select("name, stock_quantity")
    .eq("id", productId)
    .maybeSingle();
  if (!product) return { error: "Product not found." };
  if (product.stock_quantity === stockQuantity) return {};

  try {
    await changeStock({ productId, mode: "set", value: stockQuantity, reason, note, actor });
  } catch (err) {
    return { error: (err as Error).message };
  }

  await logStaffActivity(actor, {
    action: "stock.adjust",
    entityType: "product",
    entityId: productId,
    summary: `Stock for ${product.name}: ${product.stock_quantity} → ${stockQuantity} (${STOCK_REASON_LABELS[reason]}${note ? ` — ${note}` : ""})`,
    changes: { stock_quantity: { from: product.stock_quantity, to: stockQuantity }, reason },
  });

  revalidatePath("/staff/dashboard/inventory");
  revalidatePath("/");
  return {};
}

export async function updateReorderLevel(formData: FormData): Promise<{ error?: string }> {
  let actor: StaffSession;
  try {
    actor = await requireStaffAbility("manage_inventory");
  } catch {
    return { error: "Forbidden." };
  }

  const productId = formData.get("productId") as string;
  const level = Number(formData.get("reorderLevel"));
  if (!productId) return { error: "Missing product." };
  if (!Number.isInteger(level) || level < 0) return { error: "Enter a whole number, 0 or more." };

  const supabase = createServiceClient();
  const { data: product } = await supabase
    .from("products")
    .select("name, reorder_level")
    .eq("id", productId)
    .maybeSingle();
  if (!product) return { error: "Product not found." };
  if (product.reorder_level === level) return {};

  const { error } = await supabase.from("products").update({ reorder_level: level }).eq("id", productId);
  if (error) return { error: error.message };

  await logStaffActivity(actor, {
    action: "stock.reorder_level",
    entityType: "product",
    entityId: productId,
    summary: `Low-stock level for ${product.name}: ${product.reorder_level} → ${level}`,
    changes: { reorder_level: { from: product.reorder_level, to: level } },
  });
  revalidatePath("/staff/dashboard/inventory");
  return {};
}

export interface StockImportChange {
  id: string;
  slug: string;
  name: string;
  from: number;
  to: number;
}

export interface StockImportPreview {
  error?: string;
  changes: StockImportChange[];
  unchangedCount: number;
  blankCount: number;
  unknownSlugs: string[];
  invalidRows: { row: number; slug: string; value: string }[];
}

const EMPTY_PREVIEW: StockImportPreview = {
  changes: [],
  unchangedCount: 0,
  blankCount: 0,
  unknownSlugs: [],
  invalidRows: [],
};

/** Reads a stock sheet (the one exported from the Inventory page, or any
 *  CSV with `slug` and `new_stock` columns). Rows with a blank new_stock
 *  are treated as "not counted" and left alone, so a partial count is safe. */
async function analyseStockSheet(csvText: string): Promise<StockImportPreview> {
  const rows = parseCsv(csvText);
  if (rows.length < 2) return { ...EMPTY_PREVIEW, error: "The file has no data rows." };

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const slugCol = header.indexOf("slug");
  const stockCol = header.indexOf("new_stock");
  if (slugCol === -1 || stockCol === -1) {
    return { ...EMPTY_PREVIEW, error: 'The file needs "slug" and "new_stock" columns — start from the downloaded stock sheet.' };
  }

  const products = await fetchAll<{ id: string; slug: string; name: string; stock_quantity: number }>(
    (from, to) =>
      createServiceClient()
        .from("products")
        .select("id, slug, name, stock_quantity")
        .order("id")
        .range(from, to)
  );
  const bySlug = new Map(products.map((p) => [p.slug, p]));

  const preview: StockImportPreview = { ...EMPTY_PREVIEW, changes: [], unknownSlugs: [], invalidRows: [] };
  const seen = new Set<string>();

  rows.slice(1).forEach((row, i) => {
    const slug = (row[slugCol] ?? "").trim();
    const raw = (row[stockCol] ?? "").trim();
    if (!slug) return;
    if (raw === "") {
      preview.blankCount++;
      return;
    }
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 0) {
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
    if (product.stock_quantity === value) {
      preview.unchangedCount++;
      return;
    }
    preview.changes.push({ id: product.id, slug, name: product.name, from: product.stock_quantity, to: value });
  });

  return preview;
}

export async function previewStockImport(csvText: string): Promise<StockImportPreview> {
  try {
    await requireStaffAbility("manage_inventory");
  } catch {
    return { ...EMPTY_PREVIEW, error: "Forbidden." };
  }
  return analyseStockSheet(csvText);
}

const UPDATE_CONCURRENCY = 15;

/** Re-validates the same sheet server-side (never trusts the preview the
 *  browser holds) and applies only the valid, changed rows. */
export async function applyStockImport(csvText: string): Promise<{ error?: string; updated?: number; failed?: number }> {
  let actor: StaffSession;
  try {
    actor = await requireStaffAbility("manage_inventory");
  } catch {
    return { error: "Forbidden." };
  }

  const preview = await analyseStockSheet(csvText);
  if (preview.error) return { error: preview.error };

  const applied: StockImportChange[] = [];
  let failed = 0;

  for (let i = 0; i < preview.changes.length; i += UPDATE_CONCURRENCY) {
    const batch = preview.changes.slice(i, i + UPDATE_CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((c) =>
        changeStock({ productId: c.id, mode: "set", value: c.to, reason: "count", note: "Stock sheet upload", actor })
      )
    );
    results.forEach((r, j) => (r.status === "rejected" ? failed++ : applied.push(batch[j])));
  }

  await logStaffActivities(
    actor,
    applied.map((c) => ({
      action: "stock.count",
      entityType: "product" as const,
      entityId: c.id,
      summary: `Stock count for ${c.name}: ${c.from} → ${c.to}`,
      changes: { stock_quantity: { from: c.from, to: c.to }, source: "stock_sheet_upload" },
    }))
  );

  revalidatePath("/staff/dashboard/inventory");
  revalidatePath("/");
  return { updated: applied.length, failed };
}
