import { createServiceClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/supabase/fetch-all";

const DAY = 24 * 60 * 60 * 1000;
/** Typical days between placing a purchase order and receiving it. */
export const LEAD_TIME_DAYS = 14;
/** How many days of sales a reorder should cover once it arrives. */
export const TARGET_COVER_DAYS = 30;

export interface InsightProduct {
  id: string;
  name: string;
  brand: string | null;
  stock: number;
  costKobo: number | null;
  priceKobo: number | null;
  reorderLevel: number;
}

export interface SaleMovement {
  product_id: string;
  delta: number; // negative for a sale
  created_at: string;
}

export interface ProductInsight extends InsightProduct {
  sold30: number;
  sold90: number;
  lastSoldAt: string | null;
  /** Days the current stock lasts at the 90-day sales rate; null if not selling. */
  daysOfCover: number | null;
  /** Units sold in 30 days ÷ (sold + on hand). */
  sellThrough30: number | null;
  suggestedReorder: number;
}

export interface StockInsights {
  products: ProductInsight[];
  stockValueCostKobo: number;
  stockValueRetailKobo: number;
  unitsOnHand: number;
  uncostedWithStock: number;
}

export function computeStockInsights(products: InsightProduct[], sales: SaleMovement[], now = Date.now()): StockInsights {
  const sold = new Map<string, { s30: number; s90: number; last: string | null }>();
  for (const m of sales) {
    if (m.delta >= 0) continue;
    const age = now - new Date(m.created_at).getTime();
    const s = sold.get(m.product_id) ?? { s30: 0, s90: 0, last: null };
    if (age <= 90 * DAY) s.s90 += -m.delta;
    if (age <= 30 * DAY) s.s30 += -m.delta;
    if (!s.last || m.created_at > s.last) s.last = m.created_at;
    sold.set(m.product_id, s);
  }

  let stockValueCostKobo = 0;
  let stockValueRetailKobo = 0;
  let unitsOnHand = 0;
  let uncostedWithStock = 0;

  const insights = products.map((p) => {
    const s = sold.get(p.id) ?? { s30: 0, s90: 0, last: null };
    const stock = Math.max(p.stock, 0);
    const dailyRate = s.s90 / 90;
    unitsOnHand += stock;
    if (p.costKobo !== null) stockValueCostKobo += stock * p.costKobo;
    else if (stock > 0) uncostedWithStock++;
    if (p.priceKobo !== null) stockValueRetailKobo += stock * p.priceKobo;

    // Reorder when stock won't last until a new order arrives, or it's
    // already at the product's own low-stock level — but only for things
    // that actually sell.
    const needed = Math.ceil(dailyRate * (LEAD_TIME_DAYS + TARGET_COVER_DAYS)) + p.reorderLevel;
    const runsOutBeforeRestock = dailyRate > 0 && stock < dailyRate * LEAD_TIME_DAYS + p.reorderLevel;
    const suggestedReorder = s.s90 > 0 && (runsOutBeforeRestock || stock <= p.reorderLevel) ? Math.max(needed - stock, 0) : 0;

    return {
      ...p,
      sold30: s.s30,
      sold90: s.s90,
      lastSoldAt: s.last,
      daysOfCover: dailyRate > 0 ? Math.floor(stock / dailyRate) : null,
      sellThrough30: s.s30 + stock > 0 ? s.s30 / (s.s30 + stock) : null,
      suggestedReorder,
    };
  });

  return { products: insights, stockValueCostKobo, stockValueRetailKobo, unitsOnHand, uncostedWithStock };
}

export async function getStockInsights(): Promise<StockInsights> {
  const supabase = createServiceClient();
  const since = new Date(Date.now() - 365 * DAY).toISOString();
  const [products, sales] = await Promise.all([
    fetchAll<{
      id: string;
      name: string;
      stock_quantity: number;
      cost_kobo: number | null;
      price_kobo: number | null;
      reorder_level: number;
      brand: { name: string } | null;
    }>((from, to) =>
      supabase
        .from("products")
        .select("id, name, stock_quantity, cost_kobo, price_kobo, reorder_level, brand:brands(name)")
        .eq("status", "published")
        .order("id")
        .range(from, to)
        .returns<{ id: string; name: string; stock_quantity: number; cost_kobo: number | null; price_kobo: number | null; reorder_level: number; brand: { name: string } | null }[]>()
    ),
    fetchAll<SaleMovement>((from, to) =>
      supabase
        .from("stock_movements")
        .select("product_id, delta, created_at")
        .eq("reason", "sale")
        .gte("created_at", since)
        .order("id")
        .range(from, to)
    ),
  ]);

  return computeStockInsights(
    products.map((p) => ({
      id: p.id,
      name: p.name,
      brand: p.brand?.name ?? null,
      stock: p.stock_quantity,
      costKobo: p.cost_kobo,
      priceKobo: p.price_kobo,
      reorderLevel: p.reorder_level,
    })),
    sales
  );
}
