import { createServiceClient } from "@/lib/supabase/server";
import { formatNaira } from "@/lib/money";

export interface DiscountCode {
  id: string;
  code: string;
  description: string | null;
  kind: "percent" | "fixed";
  value: number;
  min_subtotal_kobo: number;
  max_discount_kobo: number | null;
  starts_at: string | null;
  ends_at: string | null;
  usage_limit: number | null;
  per_customer_limit: number | null;
  is_active: boolean;
  created_by_name: string;
  created_at: string;
}

export function normaliseCode(raw: string): string {
  return raw.trim().toUpperCase();
}

/** Discount off the product subtotal (never delivery), in kobo. */
export function computeDiscountKobo(code: Pick<DiscountCode, "kind" | "value" | "max_discount_kobo">, subtotalKobo: number): number {
  const raw = code.kind === "percent" ? Math.floor((subtotalKobo * code.value) / 100) : code.value;
  const capped = code.max_discount_kobo ? Math.min(raw, code.max_discount_kobo) : raw;
  return Math.max(0, Math.min(capped, subtotalKobo));
}

export function describeDiscount(code: Pick<DiscountCode, "kind" | "value" | "max_discount_kobo">): string {
  if (code.kind === "fixed") return `${formatNaira(code.value)} off`;
  return `${code.value}% off${code.max_discount_kobo ? ` (up to ${formatNaira(code.max_discount_kobo)})` : ""}`;
}

/** Pure eligibility rules — the caller supplies the usage counts. */
export function checkEligibility(
  code: DiscountCode,
  params: { now: Date; subtotalKobo: number; usedTotal: number; usedByCustomer: number }
): string | null {
  if (!code.is_active) return "This code is no longer active.";
  if (code.starts_at && params.now < new Date(code.starts_at)) return "This code isn't active yet.";
  if (code.ends_at && params.now > new Date(code.ends_at)) return "This code has expired.";
  if (params.subtotalKobo < code.min_subtotal_kobo) {
    return `This code needs a minimum order of ${formatNaira(code.min_subtotal_kobo)} (before delivery).`;
  }
  if (code.usage_limit !== null && params.usedTotal >= code.usage_limit) return "This code has been fully used.";
  if (code.per_customer_limit !== null && params.usedByCustomer >= code.per_customer_limit) {
    return "You've already used this code the maximum number of times.";
  }
  return null;
}

/** A use counts once the order is paid, or while it's a live (unexpired)
 *  pending checkout — unpaid orders expire after 24h and release it. */
const COUNTED_STATUSES = ["pending", "paid", "refunded"];

export async function validateDiscountCode(
  rawCode: string,
  // customerId is null for a guest checkout — there's no reliable identity
  // to enforce a per-customer limit against, so that rule simply doesn't
  // apply to guest orders (the usage_limit total still does).
  params: { subtotalKobo: number; customerId: string | null }
): Promise<{ ok: true; code: DiscountCode; discountKobo: number } | { ok: false; error: string }> {
  const supabase = createServiceClient();
  const { data: code } = await supabase
    .from("discount_codes")
    .select("*")
    .eq("code", normaliseCode(rawCode))
    .maybeSingle<DiscountCode>();
  if (!code) return { ok: false, error: "That discount code isn't valid." };

  const [{ count: usedTotal }, { count: usedByCustomer }] = await Promise.all([
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("discount_code_id", code.id)
      .in("status", COUNTED_STATUSES),
    params.customerId
      ? supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("discount_code_id", code.id)
          .eq("customer_id", params.customerId)
          .in("status", COUNTED_STATUSES)
      : Promise.resolve({ count: 0 }),
  ]);

  const error = checkEligibility(code, {
    now: new Date(),
    subtotalKobo: params.subtotalKobo,
    usedTotal: usedTotal ?? 0,
    usedByCustomer: usedByCustomer ?? 0,
  });
  if (error) return { ok: false, error };
  return { ok: true, code, discountKobo: computeDiscountKobo(code, params.subtotalKobo) };
}
