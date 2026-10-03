"use client";

import { useActionState, useState, useTransition } from "react";
import { approveRefund, rejectRefund, requestRefund } from "@/app/actions/staff-refunds";
import { formatNaira } from "@/lib/money";
import type { Refund, RefundStatus } from "@/types/database";

const STATUS_STYLES: Record<RefundStatus, string> = {
  pending_approval: "bg-amber-100 text-amber-700",
  processing: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  rejected: "bg-neutral-200 text-neutral-600",
};
const STATUS_LABELS: Record<RefundStatus, string> = {
  pending_approval: "Awaiting approval",
  processing: "Processing at Paystack",
  completed: "Completed",
  failed: "Failed",
  rejected: "Rejected",
};

interface Props {
  orderId: string;
  refunds: Refund[];
  refundableKobo: number;
  approvalLimitKobo: number;
  canRefund: boolean;
  isSuperAdmin: boolean;
  items: { productId: string; name: string; quantity: number }[];
}

function PendingDecision({ refundId }: { refundId: string }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function run(action: typeof approveRefund, fields: Record<string, string> = {}) {
    const fd = new FormData();
    fd.set("refundId", refundId);
    for (const [k, v] of Object.entries(fields)) fd.set(k, v);
    startTransition(async () => {
      const res = await action(fd);
      setMessage(res.error ?? res.notice ?? null);
    });
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          if (confirm("Approve and issue this refund now?")) run(approveRefund);
        }}
        className="rounded-full bg-brand-900 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
      >
        Approve
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          const note = prompt("Reason for rejecting (optional):");
          if (note !== null) run(rejectRefund, { note });
        }}
        className="rounded-full border border-neutral-300 px-3 py-1 text-xs font-medium disabled:opacity-50"
      >
        Reject
      </button>
      {message && <span className="text-xs text-neutral-600">{message}</span>}
    </div>
  );
}

export function OrderRefundsPanel({
  orderId,
  refunds,
  refundableKobo,
  approvalLimitKobo,
  canRefund,
  isSuperAdmin,
  items,
}: Props) {
  const [state, formAction, pending] = useActionState(requestRefund, {});
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 text-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="font-medium text-neutral-900">Refunds</p>
        {canRefund && refundableKobo > 0 && !open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-full border border-neutral-300 px-3 py-1 text-xs font-medium hover:bg-neutral-50"
          >
            Issue refund
          </button>
        )}
      </div>

      {refunds.length === 0 ? (
        <p className="text-xs text-neutral-500">No refunds on this order.</p>
      ) : (
        <ul className="mb-3 flex flex-col divide-y divide-neutral-100">
          {refunds.map((r) => (
            <li key={r.id} className="py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">{formatNaira(r.amount_kobo)}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[r.status]}`}>
                  {STATUS_LABELS[r.status]}
                </span>
              </div>
              <p className="text-xs text-neutral-600">
                {r.reason} · {r.method === "paystack" ? "To original payment" : "Paid offline"}
              </p>
              <p className="text-xs text-neutral-400">
                Requested by {r.requested_by_name} · {new Date(r.created_at).toLocaleString()}
                {r.decided_by_name && r.decided_by_name !== r.requested_by_name && ` · Decided by ${r.decided_by_name}`}
              </p>
              {r.restock_items.length > 0 && (
                <p className="text-xs text-neutral-500">
                  Restocked: {r.restock_items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
                </p>
              )}
              {r.failure_reason && <p className="text-xs text-red-600">{r.failure_reason}</p>}
              {r.status === "pending_approval" && isSuperAdmin && <PendingDecision refundId={r.id} />}
            </li>
          ))}
        </ul>
      )}

      {open && (
        <form action={formAction} className="flex flex-col gap-2 rounded-md bg-neutral-50 p-3">
          <input type="hidden" name="orderId" value={orderId} />
          <p className="text-xs text-neutral-500">
            Up to {formatNaira(refundableKobo)} can be refunded.
            {!isSuperAdmin && ` Refunds over ${formatNaira(approvalLimitKobo)} need a super admin's approval.`}
          </p>
          <label className="text-xs font-medium text-neutral-700">
            Amount (₦)
            <input
              name="amountNaira"
              type="number"
              min={1}
              step="0.01"
              max={refundableKobo / 100}
              defaultValue={refundableKobo / 100}
              required
              className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-neutral-700">
            Reason
            <input
              name="reason"
              required
              placeholder="e.g. Item arrived damaged"
              className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm"
            />
          </label>
          <div className="flex flex-col gap-1 text-xs">
            <label className="flex items-center gap-2">
              <input type="radio" name="method" value="paystack" defaultChecked />
              Refund to the customer&apos;s original payment (via Paystack)
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="method" value="offline" />
              Already refunded another way — just record it
            </label>
          </div>
          {items.length > 0 && (
            <div className="text-xs">
              <p className="mb-1 font-medium text-neutral-700">Put items back into stock?</p>
              {items.map((item) => (
                <label key={item.productId} className="flex items-center justify-between gap-2 py-0.5">
                  <span className="truncate">{item.name}</span>
                  <input
                    name={`restock_${item.productId}`}
                    type="number"
                    min={0}
                    max={item.quantity}
                    defaultValue={0}
                    className="w-16 rounded border border-neutral-300 bg-white px-1.5 py-1 text-right"
                  />
                </label>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-full bg-red-600 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {pending ? "Submitting…" : "Submit refund"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="text-xs text-neutral-500">
              Cancel
            </button>
          </div>
        </form>
      )}

      {state.error && <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{state.error}</p>}
      {state.notice && <p className="mt-2 rounded-md bg-green-50 px-3 py-2 text-xs text-green-800">{state.notice}</p>}
    </div>
  );
}
