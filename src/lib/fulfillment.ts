import type { FulfillmentStatus } from "@/types/database";

export const FULFILLMENT_LABELS: Record<FulfillmentStatus, string> = {
  unfulfilled: "Not started",
  processing: "Processing",
  packed: "Packed",
  dispatched: "Dispatched",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
};

/** The normal path an order moves along. Steps may be skipped forward
 *  (e.g. straight to dispatched) but never moved backwards. */
export const FULFILLMENT_FLOW: FulfillmentStatus[] = ["unfulfilled", "processing", "packed", "dispatched", "delivered"];

export const CANCELLABLE_FROM: FulfillmentStatus[] = ["unfulfilled", "processing", "packed"];
export const RETURNABLE_FROM: FulfillmentStatus[] = ["dispatched", "delivered"];

/** "Needs action" for the packing queue. */
export const TO_FULFIL: FulfillmentStatus[] = ["unfulfilled", "processing", "packed"];

export function canMoveTo(from: FulfillmentStatus, to: FulfillmentStatus): boolean {
  if (to === "cancelled") return CANCELLABLE_FROM.includes(from);
  if (to === "returned") return RETURNABLE_FROM.includes(from);
  const fromIndex = FULFILLMENT_FLOW.indexOf(from);
  const toIndex = FULFILLMENT_FLOW.indexOf(to);
  return fromIndex !== -1 && toIndex > fromIndex;
}

export function nextSteps(from: FulfillmentStatus): FulfillmentStatus[] {
  const fromIndex = FULFILLMENT_FLOW.indexOf(from);
  return fromIndex === -1 ? [] : FULFILLMENT_FLOW.slice(fromIndex + 1);
}
