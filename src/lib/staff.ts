import { createServiceClient } from "@/lib/supabase/server";
import type { OrderWithItems } from "@/types/database";

/** Every function here uses the service client with no per-row scoping —
 *  unlike lib/account.ts (customer-scoped), these are staff-facing and
 *  the ability check already happened before the page called this. */

export async function getDashboardStats() {
  const supabase = createServiceClient();
  const [{ count: productCount }, { count: customerCount }, { count: orderCount }, { data: paidOrders }] =
    await Promise.all([
      supabase.from("products").select("*", { count: "exact", head: true }).eq("status", "published"),
      supabase.from("customer_profiles").select("*", { count: "exact", head: true }),
      supabase.from("orders").select("*", { count: "exact", head: true }),
      supabase.from("orders").select("total_kobo").eq("status", "paid"),
    ]);

  const revenueKobo = (paidOrders ?? []).reduce((sum, o) => sum + o.total_kobo, 0);

  return {
    productCount: productCount ?? 0,
    customerCount: customerCount ?? 0,
    orderCount: orderCount ?? 0,
    revenueKobo,
  };
}

export async function getAllOrders(limit = 100): Promise<OrderWithItems[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getAllOrders failed:", error.message);
    return [];
  }
  return (data ?? []) as unknown as OrderWithItems[];
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

export async function getAllCustomers(): Promise<CustomerSummary[]> {
  const supabase = createServiceClient();
  const [{ data: profiles }, { data: orders }] = await Promise.all([
    supabase.from("customer_profiles").select("*").order("created_at", { ascending: false }),
    supabase.from("orders").select("customer_id, total_kobo, status, customer_email").not("customer_id", "is", null),
  ]);

  const statsByCustomer = new Map<string, { count: number; spent: number }>();
  for (const order of orders ?? []) {
    if (!order.customer_id) continue;
    const existing = statsByCustomer.get(order.customer_id) ?? { count: 0, spent: 0 };
    existing.count += 1;
    if (order.status === "paid") existing.spent += order.total_kobo;
    statsByCustomer.set(order.customer_id, existing);
  }

  // customer_profiles doesn't store email (that lives on auth.users) — use
  // the most recent order's email as a display fallback, since every
  // customer with orders will have one; profiles with zero orders won't
  // have an email to show, which is an acceptable gap for a v1 staff view.
  const emailByCustomer = new Map<string, string>();
  for (const order of orders ?? []) {
    if (order.customer_id && order.customer_email) emailByCustomer.set(order.customer_id, order.customer_email);
  }

  return (profiles ?? []).map((profile) => {
    const stats = statsByCustomer.get(profile.id) ?? { count: 0, spent: 0 };
    return {
      id: profile.id,
      full_name: profile.full_name,
      phone: profile.phone,
      email: emailByCustomer.get(profile.id) ?? "—",
      created_at: profile.created_at,
      order_count: stats.count,
      total_spent_kobo: stats.spent,
    };
  });
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

export interface SalesStats {
  revenueKobo: number;
  paidOrderCount: number;
  averageOrderKobo: number;
  dailyRevenue: { date: string; revenueKobo: number }[];
  topProducts: { name: string; quantitySold: number; revenueKobo: number }[];
}

export async function getSalesStats(): Promise<SalesStats> {
  const supabase = createServiceClient();
  const { data: paidOrders } = await supabase
    .from("orders")
    .select("id, total_kobo, paystack_verified_at, created_at")
    .eq("status", "paid");

  const orders = paidOrders ?? [];
  const revenueKobo = orders.reduce((sum, o) => sum + o.total_kobo, 0);
  const paidOrderCount = orders.length;
  const averageOrderKobo = paidOrderCount > 0 ? Math.round(revenueKobo / paidOrderCount) : 0;

  const byDay = new Map<string, number>();
  for (const order of orders) {
    const date = (order.paystack_verified_at ?? order.created_at).slice(0, 10);
    byDay.set(date, (byDay.get(date) ?? 0) + order.total_kobo);
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

  return { revenueKobo, paidOrderCount, averageOrderKobo, dailyRevenue, topProducts };
}
