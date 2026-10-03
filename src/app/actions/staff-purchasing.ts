"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { requireStaffAbility } from "@/lib/staff-session";
import { logStaffActivities, logStaffActivity } from "@/lib/activity-log";
import { formatMoney, formatNaira, type Currency } from "@/lib/money";
import { sanitizeSearch } from "@/lib/staff-query";
import {
  analyseProductSheet,
  EMPTY_SHEET_PREVIEW,
  parseNairaToKobo,
  type SheetChange,
  type SheetPreview,
} from "@/lib/sheet-import";
import type { StaffSession } from "@/lib/staff-auth";

type Result = { error?: string; notice?: string };

async function purchaser(): Promise<StaffSession | null> {
  try {
    return await requireStaffAbility("manage_purchasing");
  } catch {
    return null;
  }
}

function text(formData: FormData, key: string): string | null {
  const v = String(formData.get(key) ?? "").trim();
  return v || null;
}

/** Major units (naira / dollars, up to 2 decimals) → minor units. */
function toMinor(raw: FormDataEntryValue | null): number | null {
  const n = Number(String(raw ?? "").replace(/,/g, ""));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}

function parseRate(raw: FormDataEntryValue | null): number | null {
  const n = Number(String(raw ?? "").replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 10000) / 10000 : null;
}

function revalidatePo(poId?: string) {
  revalidatePath("/staff/dashboard/purchase-orders");
  if (poId) revalidatePath(`/staff/dashboard/purchase-orders/${poId}`);
}

// ── Suppliers ──────────────────────────────────────────────────────────

export async function saveSupplier(_prev: Result, formData: FormData): Promise<Result> {
  const actor = await purchaser();
  if (!actor) return { error: "Forbidden." };

  const id = text(formData, "id");
  const name = text(formData, "name");
  const kind = formData.get("kind") === "import" ? "import" : "local";
  const currency = formData.get("currency") === "USD" ? "USD" : "NGN";
  if (!name) return { error: "Supplier name is required." };

  const row = {
    name,
    kind,
    currency,
    contact_name: text(formData, "contactName"),
    phone: text(formData, "phone"),
    email: text(formData, "email"),
    address: text(formData, "address"),
    notes: text(formData, "notes"),
  };

  const supabase = createServiceClient();
  const { data, error } = id
    ? await supabase.from("suppliers").update(row).eq("id", id).select("id").single()
    : await supabase.from("suppliers").insert(row).select("id").single();
  if (error) return { error: error.code === "23505" ? "A supplier with that name already exists." : error.message };

  await logStaffActivity(actor, {
    action: id ? "supplier.update" : "supplier.create",
    entityType: "supplier",
    entityId: data.id,
    summary: `${id ? "Updated" : "Added"} supplier ${name} (${kind === "import" ? "importer" : "local"}, ${currency})`,
    changes: row,
  });
  revalidatePath("/staff/dashboard/suppliers");
  return { notice: id ? "Supplier updated." : "Supplier added." };
}

export async function setSupplierActive(formData: FormData): Promise<void> {
  const actor = await purchaser();
  if (!actor) return;
  const id = formData.get("id") as string;
  const isActive = formData.get("isActive") === "true";
  const { data } = await createServiceClient()
    .from("suppliers")
    .update({ is_active: isActive })
    .eq("id", id)
    .select("name")
    .maybeSingle();
  if (!data) return;
  await logStaffActivity(actor, {
    action: isActive ? "supplier.reactivate" : "supplier.deactivate",
    entityType: "supplier",
    entityId: id,
    summary: `${isActive ? "Reactivated" : "Deactivated"} supplier ${data.name}`,
  });
  revalidatePath("/staff/dashboard/suppliers");
}

// ── Product search for purchase-order lines ────────────────────────────

export interface PurchasableProduct {
  id: string;
  name: string;
  brand: string | null;
  stock: number;
  costKobo: number | null;
}

export async function searchPurchasableProducts(query: string): Promise<PurchasableProduct[]> {
  if (!(await purchaser())) return [];
  const q = sanitizeSearch(query);
  if (q.length < 2) return [];
  const { data } = await createServiceClient()
    .from("products")
    .select("id, name, stock_quantity, cost_kobo, brand:brands(name)")
    .neq("status", "archived")
    .or(`name.ilike.%${q}%,slug.ilike.%${q}%`)
    .order("name")
    .limit(15)
    .returns<{ id: string; name: string; stock_quantity: number; cost_kobo: number | null; brand: { name: string } | null }[]>();
  return (data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    brand: p.brand?.name ?? null,
    stock: p.stock_quantity,
    costKobo: p.cost_kobo,
  }));
}

// ── Purchase orders ────────────────────────────────────────────────────

export async function createPurchaseOrder(_prev: Result, formData: FormData): Promise<Result> {
  const actor = await purchaser();
  if (!actor) return { error: "Forbidden." };

  const supplierId = formData.get("supplierId") as string;
  const currency: Currency = formData.get("currency") === "USD" ? "USD" : "NGN";
  const exchangeRate = currency === "USD" ? parseRate(formData.get("exchangeRate")) : 1;
  if (!supplierId) return { error: "Choose a supplier." };
  if (!exchangeRate) return { error: "Enter the exchange rate (naira per dollar)." };

  let lines: { productId: string; quantity: number; unitCost: string }[];
  try {
    lines = JSON.parse(String(formData.get("lines") ?? "[]"));
  } catch {
    return { error: "Couldn't read the order lines." };
  }
  if (lines.length === 0) return { error: "Add at least one product." };
  const items = [];
  for (const line of lines) {
    const quantity = Number(line.quantity);
    const unitCostMinor = toMinor(line.unitCost);
    if (!Number.isInteger(quantity) || quantity <= 0) return { error: "Every line needs a quantity of 1 or more." };
    if (unitCostMinor === null) return { error: "Every line needs a valid unit cost." };
    items.push({ product_id: line.productId, quantity_ordered: quantity, unit_cost_minor: unitCostMinor });
  }
  if (new Set(items.map((i) => i.product_id)).size !== items.length) {
    return { error: "Each product can only appear once — combine the quantities instead." };
  }

  const supabase = createServiceClient();
  const { data: supplier } = await supabase.from("suppliers").select("name").eq("id", supplierId).maybeSingle();
  if (!supplier) return { error: "Supplier not found." };

  const { data: po, error } = await supabase
    .from("purchase_orders")
    .insert({
      supplier_id: supplierId,
      currency,
      exchange_rate: exchangeRate,
      expected_date: text(formData, "expectedDate"),
      notes: text(formData, "notes"),
      created_by: actor.userId,
      created_by_name: actor.fullName,
    })
    .select("id, po_number")
    .single();
  if (error || !po) return { error: error?.message ?? "Could not create the purchase order." };

  const { error: itemsError } = await supabase
    .from("purchase_order_items")
    .insert(items.map((i) => ({ ...i, purchase_order_id: po.id })));
  if (itemsError) {
    await supabase.from("purchase_orders").delete().eq("id", po.id);
    return { error: itemsError.message };
  }

  const totalMinor = items.reduce((sum, i) => sum + i.quantity_ordered * i.unit_cost_minor, 0);
  await logStaffActivity(actor, {
    action: "purchase_order.create",
    entityType: "purchase_order",
    entityId: po.id,
    summary: `Created ${po.po_number} for ${supplier.name}: ${items.length} line(s), ${formatMoney(totalMinor, currency)}`,
  });
  revalidatePo();
  redirect(`/staff/dashboard/purchase-orders/${po.id}`);
}

async function loadPo(poId: string) {
  const { data } = await createServiceClient()
    .from("purchase_orders")
    .select("id, po_number, status, currency, exchange_rate, supplier:suppliers(name), purchase_order_items(id, product_id, quantity_ordered, quantity_received, unit_cost_minor, product:products(name))")
    .eq("id", poId)
    .maybeSingle<{
      id: string;
      po_number: string;
      status: string;
      currency: Currency;
      exchange_rate: number;
      supplier: { name: string } | null;
      purchase_order_items: {
        id: string;
        product_id: string;
        quantity_ordered: number;
        quantity_received: number;
        unit_cost_minor: number;
        product: { name: string } | null;
      }[];
    }>();
  return data;
}

export async function removePurchaseOrderLine(formData: FormData): Promise<Result> {
  const actor = await purchaser();
  if (!actor) return { error: "Forbidden." };
  const po = await loadPo(formData.get("poId") as string);
  if (!po) return { error: "Purchase order not found." };
  if (po.status !== "draft") return { error: "Lines can only be changed while the order is a draft." };
  const line = po.purchase_order_items.find((i) => i.id === formData.get("itemId"));
  if (!line) return { error: "Line not found." };
  if (po.purchase_order_items.length === 1) return { error: "An order needs at least one line — cancel it instead." };

  const { error } = await createServiceClient().from("purchase_order_items").delete().eq("id", line.id);
  if (error) return { error: error.message };
  await logStaffActivity(actor, {
    action: "purchase_order.line_remove",
    entityType: "purchase_order",
    entityId: po.id,
    summary: `Removed ${line.product?.name} from ${po.po_number}`,
  });
  revalidatePo(po.id);
  return {};
}

export async function addPurchaseOrderLine(_prev: Result, formData: FormData): Promise<Result> {
  const actor = await purchaser();
  if (!actor) return { error: "Forbidden." };
  const po = await loadPo(formData.get("poId") as string);
  if (!po) return { error: "Purchase order not found." };
  if (po.status !== "draft") return { error: "Lines can only be changed while the order is a draft." };

  const productId = formData.get("productId") as string;
  const quantity = Number(formData.get("quantity"));
  const unitCostMinor = toMinor(formData.get("unitCost"));
  if (!productId) return { error: "Choose a product." };
  if (!Number.isInteger(quantity) || quantity <= 0) return { error: "Enter a quantity of 1 or more." };
  if (unitCostMinor === null) return { error: "Enter a valid unit cost." };

  const supabase = createServiceClient();
  const { data: product } = await supabase.from("products").select("name").eq("id", productId).maybeSingle();
  if (!product) return { error: "Product not found." };

  const { error } = await supabase.from("purchase_order_items").insert({
    purchase_order_id: po.id,
    product_id: productId,
    quantity_ordered: quantity,
    unit_cost_minor: unitCostMinor,
  });
  if (error) return { error: error.code === "23505" ? "That product is already on this order." : error.message };

  await logStaffActivity(actor, {
    action: "purchase_order.line_add",
    entityType: "purchase_order",
    entityId: po.id,
    summary: `Added ${quantity}× ${product.name} to ${po.po_number} at ${formatMoney(unitCostMinor, po.currency)} each`,
  });
  revalidatePo(po.id);
  return { notice: "Line added." };
}

/** draft → ordered (sent to supplier), or → cancelled before anything
 *  has been received. Partly-received orders can't be cancelled; what
 *  arrived is already in stock and costed. */
export async function setPurchaseOrderStatus(formData: FormData): Promise<Result> {
  const actor = await purchaser();
  if (!actor) return { error: "Forbidden." };
  const po = await loadPo(formData.get("poId") as string);
  if (!po) return { error: "Purchase order not found." };
  const to = formData.get("to") as string;

  const update: Record<string, unknown> = {};
  if (to === "ordered" && po.status === "draft") {
    update.status = "ordered";
    update.ordered_at = new Date().toISOString();
  } else if (to === "cancelled" && (po.status === "draft" || po.status === "ordered")) {
    if (po.purchase_order_items.some((i) => i.quantity_received > 0)) {
      return { error: "Goods have already been received on this order." };
    }
    update.status = "cancelled";
    update.cancelled_at = new Date().toISOString();
  } else {
    return { error: `Can't move ${po.po_number} from ${po.status} to ${to}.` };
  }

  const { data: moved, error } = await createServiceClient()
    .from("purchase_orders")
    .update(update)
    .eq("id", po.id)
    .eq("status", po.status)
    .select("id")
    .maybeSingle();
  if (error) return { error: error.message };
  if (!moved) return { error: "Someone else just updated this order — refresh and try again." };

  await logStaffActivity(actor, {
    action: `purchase_order.${to}`,
    entityType: "purchase_order",
    entityId: po.id,
    summary: `${po.po_number} (${po.supplier?.name}) marked ${to === "ordered" ? "ordered — sent to supplier" : "cancelled"}`,
  });
  revalidatePo(po.id);
  return {};
}

/** Each line is received through receive_purchase_item(), which adds the
 *  stock, writes the ledger entry, and re-averages the product's cost at
 *  the given exchange rate — atomically per line. */
export async function receivePurchaseOrder(_prev: Result, formData: FormData): Promise<Result> {
  const actor = await purchaser();
  if (!actor) return { error: "Forbidden." };
  const po = await loadPo(formData.get("poId") as string);
  if (!po) return { error: "Purchase order not found." };
  if (po.status !== "ordered" && po.status !== "partially_received") {
    return { error: "Only ordered purchase orders can be received." };
  }

  const rate = po.currency === "USD" ? parseRate(formData.get("exchangeRate")) : 1;
  if (!rate) return { error: "Enter the exchange rate you actually paid (naira per dollar)." };

  const receipts: { id: string; name: string; quantity: number }[] = [];
  for (const line of po.purchase_order_items) {
    const raw = String(formData.get(`receive_${line.id}`) ?? "").trim();
    if (!raw) continue;
    const qty = Number(raw);
    const remaining = line.quantity_ordered - line.quantity_received;
    if (!Number.isInteger(qty) || qty < 0 || qty > remaining) {
      return { error: `${line.product?.name}: receive between 0 and ${remaining}.` };
    }
    if (qty > 0) receipts.push({ id: line.id, name: line.product?.name ?? "item", quantity: qty });
  }
  if (receipts.length === 0) return { error: "Enter the quantity received for at least one line." };

  const supabase = createServiceClient();
  const done: typeof receipts = [];
  for (const r of receipts) {
    const { error } = await supabase.rpc("receive_purchase_item", {
      p_item_id: r.id,
      p_quantity: r.quantity,
      p_exchange_rate: rate,
      p_staff_id: actor.userId,
      p_staff_name: actor.fullName,
    });
    if (error) {
      await logReceipt(actor, po, done, rate);
      revalidatePo(po.id);
      return { error: `Stopped at ${r.name}: ${error.message}${done.length ? ` (${done.length} line(s) before it were received)` : ""}` };
    }
    done.push(r);
  }

  await logReceipt(actor, po, done, rate);
  revalidatePo(po.id);
  revalidatePath("/staff/dashboard/inventory");
  return { notice: `Received ${done.reduce((s, r) => s + r.quantity, 0)} item(s); stock and costs updated.` };
}

async function logReceipt(
  actor: StaffSession,
  po: { id: string; po_number: string; currency: Currency },
  done: { name: string; quantity: number }[],
  rate: number
) {
  if (done.length === 0) return;
  await logStaffActivity(actor, {
    action: "purchase_order.receive",
    entityType: "purchase_order",
    entityId: po.id,
    summary: `Received on ${po.po_number}: ${done.map((r) => `${r.quantity}× ${r.name}`).join(", ")}${po.currency === "USD" ? ` at ₦${rate.toLocaleString()}/$` : ""}`,
  });
}

export async function recordSupplierPayment(_prev: Result, formData: FormData): Promise<Result> {
  const actor = await purchaser();
  if (!actor) return { error: "Forbidden." };
  const po = await loadPo(formData.get("poId") as string);
  if (!po) return { error: "Purchase order not found." };
  if (po.status === "cancelled") return { error: "This order was cancelled." };

  const amountMinor = toMinor(formData.get("amount"));
  if (!amountMinor) return { error: "Enter the amount paid." };

  const supabase = createServiceClient();
  const { data: payments } = await supabase
    .from("purchase_order_payments")
    .select("amount_minor")
    .eq("purchase_order_id", po.id);
  const totalMinor = po.purchase_order_items.reduce((s, i) => s + i.quantity_ordered * i.unit_cost_minor, 0);
  const paidMinor = (payments ?? []).reduce((s, p) => s + p.amount_minor, 0);
  if (paidMinor + amountMinor > totalMinor) {
    return { error: `That's more than the ${formatMoney(totalMinor - paidMinor, po.currency)} still owed.` };
  }

  const { error } = await supabase.from("purchase_order_payments").insert({
    purchase_order_id: po.id,
    amount_minor: amountMinor,
    paid_on: text(formData, "paidOn") ?? new Date().toISOString().slice(0, 10),
    method: text(formData, "method"),
    note: text(formData, "note"),
    recorded_by: actor.userId,
    recorded_by_name: actor.fullName,
  });
  if (error) return { error: error.message };

  await logStaffActivity(actor, {
    action: "purchase_order.payment",
    entityType: "purchase_order",
    entityId: po.id,
    summary: `Recorded ${formatMoney(amountMinor, po.currency)} paid to ${po.supplier?.name} on ${po.po_number}`,
  });
  revalidatePo(po.id);
  return { notice: "Payment recorded." };
}

// ── Cost prices ────────────────────────────────────────────────────────

export async function setProductCost(_prev: Result, formData: FormData): Promise<Result> {
  const actor = await purchaser();
  if (!actor) return { error: "Forbidden." };
  const productId = formData.get("productId") as string;
  const raw = String(formData.get("costNaira") ?? "").trim();
  const costKobo = raw === "" ? null : parseNairaToKobo(raw);
  if (raw !== "" && costKobo === null) return { error: "Enter a valid cost." };

  const supabase = createServiceClient();
  const { data: product } = await supabase.from("products").select("name, cost_kobo").eq("id", productId).maybeSingle();
  if (!product) return { error: "Product not found." };
  if (product.cost_kobo === costKobo) return {};

  const { error } = await supabase.from("products").update({ cost_kobo: costKobo }).eq("id", productId);
  if (error) return { error: error.message };

  const fmt = (k: number | null) => (k === null ? "not set" : formatNaira(k));
  await logStaffActivity(actor, {
    action: "product.cost",
    entityType: "product",
    entityId: productId,
    summary: `Cost price for ${product.name}: ${fmt(product.cost_kobo)} → ${fmt(costKobo)}`,
    changes: { cost_kobo: { from: product.cost_kobo, to: costKobo } },
  });
  revalidatePath(`/staff/dashboard/products/${productId}/edit`);
  return { notice: "Cost saved." };
}

function analyseCostSheet(csvText: string) {
  return analyseProductSheet(csvText, { valueColumn: "new_cost_ngn", field: "cost_kobo", parse: parseNairaToKobo });
}

export async function previewCostImport(csvText: string): Promise<SheetPreview> {
  if (!(await purchaser())) return { ...EMPTY_SHEET_PREVIEW, error: "Forbidden." };
  return analyseCostSheet(csvText);
}

const COST_UPDATE_CONCURRENCY = 15;

export async function applyCostImport(csvText: string): Promise<{ error?: string; updated?: number; failed?: number }> {
  const actor = await purchaser();
  if (!actor) return { error: "Forbidden." };
  const preview = await analyseCostSheet(csvText);
  if (preview.error) return { error: preview.error };

  const supabase = createServiceClient();
  const applied: SheetChange[] = [];
  let failed = 0;
  for (let i = 0; i < preview.changes.length; i += COST_UPDATE_CONCURRENCY) {
    const batch = preview.changes.slice(i, i + COST_UPDATE_CONCURRENCY);
    const results = await Promise.all(
      batch.map((c) => supabase.from("products").update({ cost_kobo: c.to }).eq("id", c.id))
    );
    results.forEach((r, j) => (r.error ? failed++ : applied.push(batch[j])));
  }

  const fmt = (k: number | null) => (k === null ? "not set" : formatNaira(k));
  await logStaffActivities(
    actor,
    applied.map((c) => ({
      action: "product.cost",
      entityType: "product" as const,
      entityId: c.id,
      summary: `Cost price for ${c.name}: ${fmt(c.from)} → ${fmt(c.to)} (cost sheet upload)`,
      changes: { cost_kobo: { from: c.from, to: c.to } },
    }))
  );
  revalidatePath("/staff/dashboard/purchase-orders");
  return { updated: applied.length, failed };
}
