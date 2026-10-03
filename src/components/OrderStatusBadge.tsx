import { FULFILLMENT_LABELS } from "@/lib/fulfillment";
import type { FulfillmentStatus } from "@/types/database";

const STYLES: Record<string, string> = {
  paid: "bg-green-100 text-green-700",
  pending: "bg-amber-100 text-amber-700",
  failed: "bg-red-100 text-red-700",
  refunded: "bg-neutral-200 text-neutral-600",
  expired: "bg-neutral-100 text-neutral-500",
};

export function OrderStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STYLES[status] ?? STYLES.pending}`}
    >
      {status}
    </span>
  );
}

const FULFILLMENT_STYLES: Record<FulfillmentStatus, string> = {
  unfulfilled: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  processing: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  packed: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
  dispatched: "bg-purple-50 text-purple-700 ring-1 ring-purple-200",
  delivered: "bg-green-50 text-green-700 ring-1 ring-green-200",
  cancelled: "bg-neutral-100 text-neutral-500 ring-1 ring-neutral-200",
  returned: "bg-red-50 text-red-700 ring-1 ring-red-200",
};

export function FulfillmentBadge({ status }: { status: FulfillmentStatus }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${FULFILLMENT_STYLES[status]}`}>
      {FULFILLMENT_LABELS[status]}
    </span>
  );
}
