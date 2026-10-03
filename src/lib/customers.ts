import { createServiceClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/supabase/fetch-all";

const DAY = 24 * 60 * 60 * 1000;
export const VIP_SPEND_KOBO = 50_000_000; // ₦500,000 lifetime

export const CUSTOMER_SEGMENTS = [
  { value: "vip", label: "VIP (₦500k+ spent)" },
  { value: "repeat", label: "Repeat buyers (2+ orders)" },
  { value: "new", label: "Joined in last 30 days" },
  { value: "lapsed", label: "Lapsed (no order in 90 days)" },
  { value: "no_orders", label: "Never ordered" },
] as const;
export type CustomerSegment = (typeof CUSTOMER_SEGMENTS)[number]["value"];

export interface CustomerSummary {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string;
  created_at: string;
  tags: string[];
  order_count: number;
  total_spent_kobo: number;
  first_order_at: string | null;
  last_order_at: string | null;
}

export function customerSegments(c: Pick<CustomerSummary, "order_count" | "total_spent_kobo" | "created_at" | "last_order_at">, now = Date.now()): CustomerSegment[] {
  const segments: CustomerSegment[] = [];
  if (c.total_spent_kobo >= VIP_SPEND_KOBO) segments.push("vip");
  if (c.order_count >= 2) segments.push("repeat");
  if (now - new Date(c.created_at).getTime() <= 30 * DAY) segments.push("new");
  if (c.order_count > 0 && c.last_order_at && now - new Date(c.last_order_at).getTime() > 90 * DAY) segments.push("lapsed");
  if (c.order_count === 0) segments.push("no_orders");
  return segments;
}

/** Normalises free-typed tags: lower-case, trimmed, de-duplicated. */
export function parseTags(raw: string): string[] {
  return [...new Set(raw.split(",").map((t) => t.trim().toLowerCase().replace(/\s+/g, " ")).filter(Boolean))]
    .map((t) => t.slice(0, 24))
    .slice(0, 10);
}

/** Every customer with lifetime stats. Spend is net of refunds and counts
 *  paid orders only. Small enough to compute in memory for a long time. */
export async function getAllCustomerSummaries(): Promise<Omit<CustomerSummary, "email">[]> {
  const supabase = createServiceClient();
  const [profiles, orders] = await Promise.all([
    fetchAll<{ id: string; full_name: string | null; phone: string | null; created_at: string; tags: string[] }>((from, to) =>
      supabase.from("customer_profiles").select("id, full_name, phone, created_at, tags").order("created_at", { ascending: false }).range(from, to)
    ),
    fetchAll<{ customer_id: string; total_kobo: number; refunded_kobo: number; paystack_verified_at: string | null; created_at: string }>(
      (from, to) =>
        supabase
          .from("orders")
          .select("customer_id, total_kobo, refunded_kobo, paystack_verified_at, created_at")
          .in("status", ["paid", "refunded"])
          .not("customer_id", "is", null)
          .order("id")
          .range(from, to)
    ),
  ]);

  const stats = new Map<string, { count: number; spent: number; first: string; last: string }>();
  for (const o of orders) {
    const at = o.paystack_verified_at ?? o.created_at;
    const s = stats.get(o.customer_id) ?? { count: 0, spent: 0, first: at, last: at };
    s.count++;
    s.spent += o.total_kobo - o.refunded_kobo;
    if (at < s.first) s.first = at;
    if (at > s.last) s.last = at;
    stats.set(o.customer_id, s);
  }

  return profiles.map((p) => {
    const s = stats.get(p.id);
    return {
      id: p.id,
      full_name: p.full_name,
      phone: p.phone,
      created_at: p.created_at,
      tags: p.tags ?? [],
      order_count: s?.count ?? 0,
      total_spent_kobo: s?.spent ?? 0,
      first_order_at: s?.first ?? null,
      last_order_at: s?.last ?? null,
    };
  });
}

export async function attachEmails<T extends { id: string }>(rows: T[]): Promise<(T & { email: string })[]> {
  const supabase = createServiceClient();
  const users = await Promise.all(rows.map((r) => supabase.auth.admin.getUserById(r.id)));
  return rows.map((r, i) => ({ ...r, email: users[i].data.user?.email ?? "—" }));
}
