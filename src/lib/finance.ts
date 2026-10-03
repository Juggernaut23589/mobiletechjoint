import { createServiceClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/supabase/fetch-all";

/** Nigeria is UTC+1 all year (no DST), so business days are Lagos days. */
const LAGOS_OFFSET = "+01:00";

export interface Period {
  from: string; // YYYY-MM-DD, inclusive
  to: string; // YYYY-MM-DD, inclusive
  label: string;
}

export const PERIOD_PRESETS = [
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "last_30", label: "Last 30 days" },
  { value: "this_year", label: "This year" },
  { value: "all", label: "All time" },
];

function lagosToday(): Date {
  return new Date(Date.now() + 60 * 60 * 1000);
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function resolvePeriod(preset: string | undefined, from?: string, to?: string): Period {
  const isDate = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
  if (isDate(from) && isDate(to) && from! <= to!) return { from: from!, to: to!, label: `${from} – ${to}` };

  const today = lagosToday();
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth();
  switch (preset) {
    case "last_month":
      return {
        from: ymd(new Date(Date.UTC(y, m - 1, 1))),
        to: ymd(new Date(Date.UTC(y, m, 0))),
        label: "Last month",
      };
    case "last_30":
      return { from: ymd(new Date(today.getTime() - 29 * 86400000)), to: ymd(today), label: "Last 30 days" };
    case "this_year":
      return { from: `${y}-01-01`, to: ymd(today), label: "This year" };
    case "all":
      return { from: "2020-01-01", to: ymd(today), label: "All time" };
    default:
      return { from: ymd(new Date(Date.UTC(y, m, 1))), to: ymd(today), label: "This month" };
  }
}

export function periodBounds(p: Period): [string, string] {
  return [`${p.from}T00:00:00${LAGOS_OFFSET}`, `${p.to}T23:59:59.999${LAGOS_OFFSET}`];
}

export interface MarginRow {
  key: string;
  units: number;
  salesKobo: number;
  cogsKobo: number;
  /** Units sold with no cost recorded — their margin can't be known. */
  uncostedUnits: number;
}

export interface ProfitAndLoss {
  period: Period;
  orderCount: number;
  unitsSold: number;
  productSalesKobo: number;
  deliveryFeesKobo: number;
  refundsKobo: number;
  netSalesKobo: number;
  cogsKobo: number;
  grossProfitKobo: number;
  grossMarginPct: number | null;
  paymentFeesKobo: number;
  expensesKobo: number;
  expensesByCategory: { category: string; kobo: number }[];
  netProfitKobo: number;
  uncostedUnits: number;
  uncostedSalesKobo: number;
  daily: { date: string; netKobo: number }[];
  byProduct: MarginRow[];
  byBrand: MarginRow[];
  byCategory: MarginRow[];
}

export interface OrderRow {
  id: string;
  delivery_fee_kobo: number;
  refunded_kobo: number;
  paystack_fee_kobo: number;
  paystack_verified_at: string | null;
  created_at: string;
}

export interface ItemRow {
  order_id: string;
  product_id: string | null;
  product_name_snapshot: string;
  unit_price_kobo_snapshot: number;
  unit_cost_kobo_snapshot: number | null;
  quantity: number;
  product: { brand: { name: string } | null; category: { name: string } | null } | null;
}

const IN_CHUNK = 150;

async function inChunks<T>(ids: string[], load: (chunk: string[]) => PromiseLike<T[]>): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < ids.length; i += IN_CHUNK) out.push(...(await load(ids.slice(i, i + IN_CHUNK))));
  return out;
}

function bump(map: Map<string, MarginRow>, key: string, units: number, sales: number, cogs: number, uncosted: number) {
  const row = map.get(key) ?? { key, units: 0, salesKobo: 0, cogsKobo: 0, uncostedUnits: 0 };
  row.units += units;
  row.salesKobo += sales;
  row.cogsKobo += cogs;
  row.uncostedUnits += uncosted;
  map.set(key, row);
}

/**
 * Sales are recognised on the date Paystack confirmed payment. Refunds are
 * counted against the period of the original sale. Cost of goods uses the
 * cost captured on each order line at checkout, less any units put back
 * into stock by a refund, return or cancellation. Purchases themselves are
 * not an expense here — stock only becomes a cost when it's sold.
 */
export async function getProfitAndLoss(period: Period): Promise<ProfitAndLoss> {
  const supabase = createServiceClient();
  const [start, end] = periodBounds(period);

  const orders = await fetchAll<OrderRow>((from, to) =>
    supabase
      .from("orders")
      .select("id, delivery_fee_kobo, refunded_kobo, paystack_fee_kobo, paystack_verified_at, created_at")
      .in("status", ["paid", "refunded"])
      .gte("paystack_verified_at", start)
      .lte("paystack_verified_at", end)
      .order("id")
      .range(from, to)
  );
  const orderIds = orders.map((o) => o.id);

  const [items, restocks, expenses] = await Promise.all([
    inChunks<ItemRow>(orderIds, (chunk) =>
      supabase
        .from("order_items")
        .select(
          "order_id, product_id, product_name_snapshot, unit_price_kobo_snapshot, unit_cost_kobo_snapshot, quantity, product:products(brand:brands(name), category:categories(name))"
        )
        .in("order_id", chunk)
        .returns<ItemRow[]>()
        .then((r) => r.data ?? [])
    ),
    inChunks<{ order_id: string; product_id: string; delta: number }>(orderIds, (chunk) =>
      supabase
        .from("stock_movements")
        .select("order_id, product_id, delta")
        .in("order_id", chunk)
        .in("reason", ["refund_restock", "return", "cancellation"])
        .then((r) => r.data ?? [])
    ),
    fetchAll<{ amount_kobo: number; category: string | null }>((from, to) =>
      supabase
        .from("expenses")
        .select("amount_kobo, category")
        .eq("status", "approved")
        .is("voided_at", null)
        .gte("incurred_on", period.from)
        .lte("incurred_on", period.to)
        .order("id")
        .range(from, to)
    ),
  ]);

  return computeProfitAndLoss(period, orders, items, restocks, expenses);
}

/** Pure P&L arithmetic over already-loaded rows (kept separate so it can
 *  be tested without a database). */
export function computeProfitAndLoss(
  period: Period,
  orders: OrderRow[],
  items: ItemRow[],
  restocks: { order_id: string; product_id: string; delta: number }[],
  expenses: { amount_kobo: number; category: string | null }[]
): ProfitAndLoss {
  const costByOrderProduct = new Map<string, number | null>();
  const byProduct = new Map<string, MarginRow>();
  const byBrand = new Map<string, MarginRow>();
  const byCategory = new Map<string, MarginRow>();
  let productSalesKobo = 0;
  let cogsKobo = 0;
  let unitsSold = 0;
  let uncostedUnits = 0;
  let uncostedSalesKobo = 0;
  const salesByOrder = new Map<string, number>();

  for (const item of items) {
    const sales = item.unit_price_kobo_snapshot * item.quantity;
    const cost = item.unit_cost_kobo_snapshot;
    const cogs = cost === null ? 0 : cost * item.quantity;
    const uncosted = cost === null ? item.quantity : 0;
    productSalesKobo += sales;
    cogsKobo += cogs;
    unitsSold += item.quantity;
    uncostedUnits += uncosted;
    if (cost === null) uncostedSalesKobo += sales;
    salesByOrder.set(item.order_id, (salesByOrder.get(item.order_id) ?? 0) + sales);
    if (item.product_id) costByOrderProduct.set(`${item.order_id}:${item.product_id}`, cost);

    bump(byProduct, item.product_name_snapshot, item.quantity, sales, cogs, uncosted);
    bump(byBrand, item.product?.brand?.name ?? "No brand", item.quantity, sales, cogs, uncosted);
    bump(byCategory, item.product?.category?.name ?? "Uncategorised", item.quantity, sales, cogs, uncosted);
  }

  // Units that came back into stock were never really "sold".
  for (const r of restocks) {
    const cost = costByOrderProduct.get(`${r.order_id}:${r.product_id}`);
    if (cost) cogsKobo -= cost * r.delta;
  }

  const deliveryFeesKobo = orders.reduce((s, o) => s + o.delivery_fee_kobo, 0);
  const refundsKobo = orders.reduce((s, o) => s + o.refunded_kobo, 0);
  const paymentFeesKobo = orders.reduce((s, o) => s + o.paystack_fee_kobo, 0);
  const netSalesKobo = productSalesKobo - refundsKobo;
  const grossProfitKobo = netSalesKobo - cogsKobo;

  const expenseMap = new Map<string, number>();
  for (const e of expenses) {
    const key = e.category?.trim() || "Uncategorised";
    expenseMap.set(key, (expenseMap.get(key) ?? 0) + e.amount_kobo);
  }
  const expensesKobo = expenses.reduce((s, e) => s + e.amount_kobo, 0);

  const dailyMap = new Map<string, number>();
  for (const o of orders) {
    const lagosDate = new Date(new Date(o.paystack_verified_at ?? o.created_at).getTime() + 3600000)
      .toISOString()
      .slice(0, 10);
    const net = (salesByOrder.get(o.id) ?? 0) + o.delivery_fee_kobo - o.refunded_kobo;
    dailyMap.set(lagosDate, (dailyMap.get(lagosDate) ?? 0) + net);
  }

  const sortRows = (m: Map<string, MarginRow>) => [...m.values()].sort((a, b) => b.salesKobo - a.salesKobo);

  return {
    period,
    orderCount: orders.length,
    unitsSold,
    productSalesKobo,
    deliveryFeesKobo,
    refundsKobo,
    netSalesKobo,
    cogsKobo,
    grossProfitKobo,
    grossMarginPct: netSalesKobo > 0 ? (grossProfitKobo / netSalesKobo) * 100 : null,
    paymentFeesKobo,
    expensesKobo,
    expensesByCategory: [...expenseMap.entries()]
      .map(([category, kobo]) => ({ category, kobo }))
      .sort((a, b) => b.kobo - a.kobo),
    netProfitKobo: grossProfitKobo + deliveryFeesKobo - paymentFeesKobo - expensesKobo,
    uncostedUnits,
    uncostedSalesKobo,
    daily: [...dailyMap.entries()].map(([date, netKobo]) => ({ date, netKobo })).sort((a, b) => a.date.localeCompare(b.date)),
    byProduct: sortRows(byProduct),
    byBrand: sortRows(byBrand),
    byCategory: sortRows(byCategory),
  };
}
