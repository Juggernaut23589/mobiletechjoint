"use client";

import { useActionState, useState } from "react";
import { updateFulfillment } from "@/app/actions/staff-fulfillment";
import { FulfillmentBadge } from "@/components/OrderStatusBadge";
import {
  CANCELLABLE_FROM,
  FULFILLMENT_LABELS,
  nextSteps,
  RETURNABLE_FROM,
} from "@/lib/fulfillment";
import type { FulfillmentStatus } from "@/types/database";

interface Props {
  orderId: string;
  status: FulfillmentStatus;
  canFulfil: boolean;
  dispatch: {
    method: "rider" | "courier" | null;
    riderName: string | null;
    courierName: string | null;
    trackingNumber: string | null;
  };
  timestamps: { label: string; at: string | null }[];
  riders: { id: string; name: string }[];
}

export function OrderFulfillmentPanel({ orderId, status, canFulfil, dispatch, timestamps, riders }: Props) {
  const [state, formAction, pending] = useActionState(updateFulfillment, {});
  const steps = nextSteps(status);
  const actions: FulfillmentStatus[] = [
    ...steps,
    ...(CANCELLABLE_FROM.includes(status) ? (["cancelled"] as FulfillmentStatus[]) : []),
    ...(RETURNABLE_FROM.includes(status) ? (["returned"] as FulfillmentStatus[]) : []),
  ];
  const [chosen, setTo] = useState<FulfillmentStatus | "">(steps[0] ?? "");
  // After a successful move the status prop changes; fall back to the new
  // first step rather than keeping a choice that's no longer valid.
  const to = chosen && actions.includes(chosen) ? chosen : (actions[0] ?? "");
  const [method, setMethod] = useState<"rider" | "courier">("courier");
  const needsDispatchInfo = to === "dispatched";
  const isRestockable = to === "cancelled" || to === "returned";

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 text-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="font-medium text-neutral-900">Fulfilment</p>
        <FulfillmentBadge status={status} />
      </div>

      {dispatch.method && (
        <p className="mb-2 text-xs text-neutral-600">
          {dispatch.method === "courier"
            ? `Courier: ${dispatch.courierName}${dispatch.trackingNumber ? ` · Tracking ${dispatch.trackingNumber}` : ""}`
            : `Rider: ${dispatch.riderName ?? "—"}`}
        </p>
      )}

      <ol className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
        {timestamps
          .filter((t) => t.at)
          .map((t) => (
            <li key={t.label}>
              <span className="font-medium text-neutral-700">{t.label}</span>{" "}
              {new Date(t.at!).toLocaleString()}
            </li>
          ))}
      </ol>

      {!canFulfil ? (
        <p className="text-xs text-neutral-500">Fulfilment starts once the order is paid.</p>
      ) : actions.length === 0 ? (
        <p className="text-xs text-neutral-500">Nothing left to do on this order.</p>
      ) : (
        <form action={formAction} className="flex flex-col gap-2 rounded-md bg-neutral-50 p-3">
          <input type="hidden" name="orderId" value={orderId} />
          <label className="text-xs font-medium text-neutral-700">
            Move to
            <select
              name="to"
              value={to}
              onChange={(e) => setTo(e.target.value as FulfillmentStatus)}
              className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm"
            >
              {actions.map((a) => (
                <option key={a} value={a}>
                  {FULFILLMENT_LABELS[a]}
                </option>
              ))}
            </select>
          </label>

          {needsDispatchInfo && (
            <div className="flex flex-col gap-2">
              <div className="flex gap-3 text-xs">
                {(["courier", "rider"] as const).map((m) => (
                  <label key={m} className="flex items-center gap-1">
                    <input
                      type="radio"
                      name="dispatchMethod"
                      value={m}
                      checked={method === m}
                      onChange={() => setMethod(m)}
                    />
                    {m === "courier" ? "Courier company" : "Our rider"}
                  </label>
                ))}
              </div>
              {method === "courier" ? (
                <div className="flex flex-wrap gap-2">
                  <input
                    name="courierName"
                    required
                    placeholder="Courier (e.g. GIG Logistics)"
                    className="min-w-0 flex-1 rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm"
                  />
                  <input
                    name="trackingNumber"
                    placeholder="Tracking number (optional)"
                    className="min-w-0 flex-1 rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm"
                  />
                </div>
              ) : (
                <select
                  name="riderStaffId"
                  required
                  defaultValue=""
                  className="rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm"
                >
                  <option value="" disabled>
                    Choose the rider…
                  </option>
                  {riders.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {isRestockable && (
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" name="restock" defaultChecked />
              Put the items back into stock
            </label>
          )}

          {(to === "dispatched" || to === "delivered") && (
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                defaultChecked
                onChange={(e) => {
                  const hidden = e.currentTarget.form?.elements.namedItem("notify") as HTMLInputElement | null;
                  if (hidden) hidden.value = e.currentTarget.checked ? "on" : "off";
                }}
              />
              Email the customer
              <input type="hidden" name="notify" defaultValue="on" />
            </label>
          )}

          <input
            name="note"
            placeholder="Note (optional)"
            className="rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm"
          />

          <button
            type="submit"
            disabled={pending || !to}
            className="self-start rounded-full bg-brand-900 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {pending ? "Saving…" : to ? `Mark ${FULFILLMENT_LABELS[to].toLowerCase()}` : "Update"}
          </button>
        </form>
      )}

      {state.error && <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{state.error}</p>}
      {state.notice && <p className="mt-2 rounded-md bg-green-50 px-3 py-2 text-xs text-green-800">{state.notice}</p>}
    </div>
  );
}
