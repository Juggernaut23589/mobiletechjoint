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
}

/** The "what needs doing now" numbers for the staff overview. */
export async function getAttentionCounts(): Promise<AttentionCounts> {
  const supabase = createServiceClient();
  const head = { count: "exact" as const, head: true };
  const [toFulfil, outForDelivery, refunds, lowStock, outOfStock, pendingStaff] = await Promise.all([
    supabase.from("orders").select("*", head).eq("status", "paid").in("fulfillment_status", ["unfulfilled", "processing", "packed"]),
    supabase.from("orders").select("*", head).eq("fulfillment_status", "dispatched"),
    supabase.from("refunds").select("*", head).eq("status", "pending_approval"),
    supabase.from("products").select("*", head).eq("status", "published").eq("is_low_stock", true).gt("stock_quantity", 0),
    supabase.from("products").select("*", head).eq("status", "published").lte("stock_quantity", 0),
    supabase.from("staff_profiles").select("*", head).eq("is_pending", true),
  ]);
  return {
    toFulfil: toFulfil.count ?? 0,
    outForDelivery: outForDelivery.count ?? 0,
    refundsAwaitingApproval: refunds.count ?? 0,
    lowStock: lowStock.count ?? 0,
    outOfStock: outOfStock.count ?? 0,
    pendingStaff: pendingStaff.count ?? 0,
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

export interface CustomerSummary {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string;
  created_at: string;
  order_count: number;
  total_spent_kobo: number;
}

/** One page of customers with their order stats. Email lives on
 *  auth.users (customer_profiles doesn't store it), so it's looked up per
 *  customer on the page rather than guessed from their latest order. */
export async function getCustomersPage({
  search,
  from,
  to,
}: {
  search: string;
  from: number;
  to: number;
}): Promise<{ customers: CustomerSummary[]; total: number }> {
  const supabase = createServiceClient();
  let query = supabase
    .from("customer_profiles")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);
  if (search) query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`);
  const { data: profiles, count } = await query;

  const ids = (profiles ?? []).map((p) => p.id);
  if (ids.length === 0) return { customers: [], total: count ?? 0 };

  const [{ data: orders }, users] = await Promise.all([
    supabase.from("orders").select("customer_id, total_kobo, status").in("customer_id", ids),
    Promise.all(ids.map((id) => supabase.auth.admin.getUserById(id))),
  ]);

  const statsByCustomer = new Map<string, { count: number; spent: number }>();
  for (const order of orders ?? []) {
    if (!order.customer_id) continue;
    const existing = statsByCustomer.get(order.customer_id) ?? { count: 0, spent: 0 };
    existing.count += 1;
    if (order.status === "paid") existing.spent += order.total_kobo;
    statsByCustomer.set(order.customer_id, existing);
  }
  const emailById = new Map(ids.map((id, i) => [id, users[i].data.user?.email ?? "—"]));

  return {
    total: count ?? 0,
    customers: (profiles ?? []).map((profile) => {
      const stats = statsByCustomer.get(profile.id) ?? { count: 0, spent: 0 };
      return {
        id: profile.id,
        full_name: profile.full_name,
        phone: profile.phone,
        email: emailById.get(profile.id) ?? "—",
        created_at: profile.created_at,
        order_count: stats.count,
        total_spent_kobo: stats.spent,
      };
    }),
  };
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
}

export async function getExpenses(limit = 200): Promise<Expense[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("expenses")
    .select("id, description, amount_kobo, category, incurred_on, created_at")
    .order("incurred_on", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getExpenses failed:", error.message);
    return [];
  }
  return data ?? [];
}

export interface SalesStats {
  /** Everything customers paid, before refunds. */
  grossKobo: number;
  refundedKobo: number;
  /** grossKobo − refundedKobo. */
  revenueKobo: number;
  paidOrderCount: number;
  averageOrderKobo: number;
  totalExpensesKobo: number;
  netIncomeKobo: number;
  dailyRevenue: { date: string; revenueKobo: number }[];
  topProducts: { name: string; quantitySold: number; revenueKobo: number }[];
}

export async function getSalesStats(): Promise<SalesStats> {
  const supabase = createServiceClient();
  const [orders, expenseRows] = await Promise.all([
    fetchAll<{
      id: string;
      status: string;
      total_kobo: number;
      refunded_kobo: number;
      paystack_verified_at: string | null;
      created_at: string;
    }>((from, to) =>
      supabase
        .from("orders")
        .select("id, status, total_kobo, refunded_kobo, paystack_verified_at, created_at")
        .in("status", ["paid", "refunded"])
        .order("id")
        .range(from, to)
    ),
    fetchAll<{ amount_kobo: number }>((from, to) =>
      supabase.from("expenses").select("amount_kobo").order("id").range(from, to)
    ),
  ]);

  const totalExpensesKobo = expenseRows.reduce((sum, e) => sum + e.amount_kobo, 0);
  const grossKobo = orders.reduce((sum, o) => sum + o.total_kobo, 0);
  const refundedKobo = orders.reduce((sum, o) => sum + o.refunded_kobo, 0);
  const revenueKobo = grossKobo - refundedKobo;
  const paidOrderCount = orders.filter((o) => o.status === "paid").length;
  const averageOrderKobo = orders.length > 0 ? Math.round(grossKobo / orders.length) : 0;

  const byDay = new Map<string, number>();
  for (const order of orders) {
    const date = (order.paystack_verified_at ?? order.created_at).slice(0, 10);
    byDay.set(date, (byDay.get(date) ?? 0) + order.total_kobo - order.refunded_kobo);
  }
  const dailyRevenue = Array.from(byDay.entries())
    .map(([date, revenueKobo]) => ({ date, revenueKobo }))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 14);

  const orderIds = orders.map((o) => o.id);
  const topProducts: SalesStats["topProducts"] = [];
  if (orderIds.length > 0) {
    const { data: items } = await supabase
      .from("order_items")
      .select("product_name_snapshot, quantity, unit_price_kobo_snapshot")
      .in("order_id", orderIds);

    const byProduct = new Map<string, { quantitySold: number; revenueKobo: number }>();
    for (const item of items ?? []) {
      const existing = byProduct.get(item.product_name_snapshot) ?? { quantitySold: 0, revenueKobo: 0 };
      existing.quantitySold += item.quantity;
      existing.revenueKobo += item.quantity * item.unit_price_kobo_snapshot;
      byProduct.set(item.product_name_snapshot, existing);
    }
    topProducts.push(
      ...Array.from(byProduct.entries())
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => b.revenueKobo - a.revenueKobo)
        .slice(0, 10)
    );
  }

  return {
    grossKobo,
    refundedKobo,
    revenueKobo,
    paidOrderCount,
    averageOrderKobo,
    totalExpensesKobo,
    netIncomeKobo: revenueKobo - totalExpensesKobo,
    dailyRevenue,
    topProducts,
  };
}
