import { createServiceClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/supabase/fetch-all";
import type { OrderWithItems } from "@/types/database";

/** Every function here uses the service client with no per-row scoping —
 *  unlike lib/account.ts (customer-scoped), these are staff-facing and
 *  the ability check already happened before the page called this. */

export async function getDashboardStats() {
  const supabase = createServiceClient();
  const [{ count: productCount }, { count: customerCount }, { count: orderCount }, paidOrders] =
    await Promise.all([
      supabase.from("products").select("*", { count: "exact", head: true }).eq("status", "published"),
      supabase.from("customer_profiles").select("*", { count: "exact", head: true }),
      supabase.from("orders").select("*", { count: "exact", head: true }),
      fetchAll<{ total_kobo: number; refunded_kobo: number }>((from, to) =>
        supabase.from("orders").select("total_kobo, refunded_kobo").eq("status", "paid").order("id").range(from, to)
      ),
    ]);

  // Net of partial refunds; fully refunded orders have status 'refunded'.
  const revenueKobo = paidOrders.reduce((sum, o) => sum + o.total_kobo - o.refunded_kobo, 0);

  return {
    productCount: productCount ?? 0,
    customerCount: customerCount ?? 0,
    orderCount: orderCount ?? 0,
    revenueKobo,
  };
}

export interface AttentionCounts {
  toFulfil: number;
  outForDelivery: number;
  refundsAwaitingApproval: number;
  lowStock: number;
  outOfStock: number;
  pendingStaff: number;
  expensesAwaitingApproval: number;
  purchaseOrdersAwaitingDelivery: number;
}

/** The "what needs doing now" numbers for the staff overview. */
export async function getAttentionCounts(): Promise<AttentionCounts> {
  const supabase = createServiceClient();
  const head = { count: "exact" as const, head: true };
  const [toFulfil, outForDelivery, refunds, lowStock, outOfStock, pendingStaff, expenses, openPos] = await Promise.all([
    supabase.from("orders").select("*", head).eq("status", "paid").in("fulfillment_status", ["unfulfilled", "processing", "packed"]),
    supabase.from("orders").select("*", head).eq("fulfillment_status", "dispatched"),
    supabase.from("refunds").select("*", head).eq("status", "pending_approval"),
    supabase.from("products").select("*", head).eq("status", "published").eq("is_low_stock", true).gt("stock_quantity", 0),
    supabase.from("products").select("*", head).eq("status", "published").lte("stock_quantity", 0),
    supabase.from("staff_profiles").select("*", head).eq("is_pending", true),
    supabase.from("expenses").select("*", head).eq("status", "pending_approval").is("voided_at", null),
    supabase.from("purchase_orders").select("*", head).in("status", ["ordered", "partially_received"]),
  ]);
  return {
    toFulfil: toFulfil.count ?? 0,
    outForDelivery: outForDelivery.count ?? 0,
    refundsAwaitingApproval: refunds.count ?? 0,
    lowStock: lowStock.count ?? 0,
    outOfStock: outOfStock.count ?? 0,
    pendingStaff: pendingStaff.count ?? 0,
    expensesAwaitingApproval: expenses.count ?? 0,
    purchaseOrdersAwaitingDelivery: openPos.count ?? 0,
  };
}

export async function getOrderById(orderId: string): Promise<OrderWithItems | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    console.error("getOrderById failed:", error.message);
    return null;
  }
  return data as unknown as OrderWithItems | null;
}

export async function getCustomerOrdersForStaff(customerId: string): Promise<OrderWithItems[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data ?? []) as unknown as OrderWithItems[];
}

export interface Expense {
  id: string;
  description: string;
  amount_kobo: number;
  category: string | null;
  incurred_on: string;
  created_at: string;
  status: "pending_approval" | "approved" | "rejected";
  recorded_by_name: string | null;
  approved_by_name: string | null;
  receipt_path: string | null;
  voided_at: string | null;
  voided_by_name: string | null;
  void_reason: string | null;
}

export async function getExpenses({
  from,
  to,
  rangeFrom,
  rangeTo,
}: {
  from: string;
  to: string;
  rangeFrom: number;
  rangeTo: number;
}): Promise<{ expenses: Expense[]; total: number }> {
  const { data, count, error } = await createServiceClient()
    .from("expenses")
    .select(
      "id, description, amount_kobo, category, incurred_on, created_at, status, recorded_by_name, approved_by_name, receipt_path, voided_at, voided_by_name, void_reason",
      { count: "exact" }
    )
    .gte("incurred_on", from)
    .lte("incurred_on", to)
    .order("incurred_on", { ascending: false })
    .order("created_at", { ascending: false })
    .range(rangeFrom, rangeTo);

  if (error) {
    console.error("getExpenses failed:", error.message);
    return { expenses: [], total: 0 };
  }
  return { expenses: (data ?? []) as Expense[], total: count ?? 0 };
}
