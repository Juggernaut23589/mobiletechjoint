import type { PurchaseOrderStatus } from "@/types/database";

const STYLES: Record<PurchaseOrderStatus, string> = {
  draft: "bg-neutral-100 text-neutral-600",
  ordered: "bg-blue-100 text-blue-700",
  partially_received: "bg-amber-100 text-amber-700",
  received: "bg-green-100 text-green-700",
  cancelled: "bg-neutral-200 text-neutral-500",
};

export const PO_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  draft: "Draft",
  ordered: "Ordered",
  partially_received: "Partly received",
  received: "Received",
  cancelled: "Cancelled",
};

export function PurchaseOrderStatusBadge({ status }: { status: PurchaseOrderStatus }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[status]}`}>
      {PO_STATUS_LABELS[status]}
    </span>
  );
}
