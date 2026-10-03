import type { StockReason } from "@/types/database";

export const STOCK_REASON_LABELS: Record<StockReason, string> = {
  initial: "Opening balance",
  sale: "Sold",
  restock: "Restock received",
  count: "Stock count",
  correction: "Correction",
  damage: "Damaged",
  loss: "Lost / stolen",
  return: "Customer return",
  refund_restock: "Restocked on refund",
  cancellation: "Order cancelled",
  purchase: "Purchase received",
};

/** Reasons a staff member can pick when adjusting stock by hand. */
export const MANUAL_STOCK_REASONS: StockReason[] = ["count", "restock", "correction", "damage", "loss", "return"];
