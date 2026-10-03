"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireStaffAbility } from "@/lib/staff-session";
import { logStaffActivity, logStaffActivities } from "@/lib/activity-log";
import {
  analyseProductSheet,
  EMPTY_SHEET_PREVIEW,
  parseWholeNumber,
  type SheetChange,
  type SheetPreview,
} from "@/lib/sheet-import";
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

export type { SheetPreview as StockImportPreview } from "@/lib/sheet-import";

function analyseStockSheet(csvText: string) {
  return analyseProductSheet(csvText, {
    valueColumn: "new_stock",
    field: "stock_quantity",
    parse: parseWholeNumber,
  });
}

export async function previewStockImport(csvText: string): Promise<SheetPreview> {
  try {
    await requireStaffAbility("manage_inventory");
  } catch {
    return { ...EMPTY_SHEET_PREVIEW, error: "Forbidden." };
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

  const applied: SheetChange[] = [];
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
