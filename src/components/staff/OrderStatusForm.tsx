"use client";

import { useTransition } from "react";
import { updateOrderStatus } from "@/app/actions/staff-orders";

export function OrderStatusForm({
  orderId,
  currentStatus,
}: {
  orderId: string;
  currentStatus: string;
}) {
  const [isPending, startTransition] = useTransition();

  function setStatus(status: "failed" | "refunded") {
    const formData = new FormData();
    formData.set("orderId", orderId);
    formData.set("status", status);
    startTransition(() => {
      updateOrderStatus(formData);
    });
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        disabled={isPending || currentStatus === "refunded"}
        onClick={() => setStatus("refunded")}
        className="rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:bg-neutral-50 disabled:opacity-50"
      >
        Mark Refunded
      </button>
      <button
        type="button"
        disabled={isPending || currentStatus === "failed"}
        onClick={() => setStatus("failed")}
        className="rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:bg-neutral-50 disabled:opacity-50"
      >
        Mark Failed
      </button>
    </div>
  );
}
