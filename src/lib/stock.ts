import { createServiceClient } from "@/lib/supabase/server";
import type { StaffSession } from "@/lib/staff-auth";
import type { StockReason } from "@/types/database";

export { MANUAL_STOCK_REASONS, STOCK_REASON_LABELS } from "@/lib/stock-labels";

/** The single way stock changes: the DB function locks the row, clamps at
 *  zero and writes the stock_movements entry in the same transaction.
 *  Returns the new quantity. */
export async function changeStock(params: {
  productId: string;
  mode: "delta" | "set";
  value: number;
  reason: StockReason;
  note?: string | null;
  orderId?: string | null;
  actor?: StaffSession | null;
}): Promise<number> {
  const { data, error } = await createServiceClient().rpc("apply_stock_change", {
    p_product_id: params.productId,
    p_mode: params.mode,
    p_value: params.value,
    p_reason: params.reason,
    p_note: params.note ?? null,
    p_order_id: params.orderId ?? null,
    p_staff_id: params.actor?.userId ?? null,
    p_staff_name: params.actor?.fullName ?? null,
  });
  if (error) throw new Error(error.message);
  return data as number;
}
