"use client";

import { useActionState, useState, useTransition } from "react";
import {
  addPurchaseOrderLine,
  receivePurchaseOrder,
  recordSupplierPayment,
  removePurchaseOrderLine,
  setPurchaseOrderStatus,
} from "@/app/actions/staff-purchasing";
import { ProductPicker } from "@/components/staff/ProductPicker";
import type { PurchasableProduct } from "@/app/actions/staff-purchasing";
import type { Currency } from "@/lib/money";

const input = "rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm";

function Feedback({ state }: { state: { error?: string; notice?: string } }) {
  if (state.error) return <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{state.error}</p>;
  if (state.notice) return <p className="mt-2 rounded-md bg-green-50 px-3 py-2 text-xs text-green-800">{state.notice}</p>;
  return null;
}

export function PurchaseOrderStatusButtons({
  poId,
  canOrder,
  canCancel,
}: {
  poId: string;
  canOrder: boolean;
  canCancel: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function move(to: "ordered" | "cancelled") {
    const fd = new FormData();
    fd.set("poId", poId);
    fd.set("to", to);
    startTransition(async () => {
      const res = await setPurchaseOrderStatus(fd);
      setError(res.error ?? null);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canOrder && (
        <button
          type="button"
          disabled={isPending}
          onClick={() => move("ordered")}
          className="rounded-full bg-brand-900 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          Mark as ordered
        </button>
      )}
      {canCancel && (
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            if (confirm("Cancel this purchase order?")) move("cancelled");
          }}
          className="rounded-full border border-neutral-300 px-4 py-1.5 text-xs font-medium text-neutral-600 disabled:opacity-50"
        >
          Cancel order
        </button>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}

export function RemoveLineButton({ poId, itemId }: { poId: string; itemId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          const fd = new FormData();
          fd.set("poId", poId);
          fd.set("itemId", itemId);
          startTransition(async () => setError((await removePurchaseOrderLine(fd)).error ?? null));
        }}
        className="text-xs text-neutral-400 hover:text-red-600"
      >
        Remove
      </button>
      {error && <span className="block text-xs text-red-600">{error}</span>}
    </>
  );
}

export function AddLineForm({ poId, currency, existingIds }: { poId: string; currency: Currency; existingIds: string[] }) {
  const [state, formAction, pending] = useActionState(addPurchaseOrderLine, {});
  const [product, setProduct] = useState<PurchasableProduct | null>(null);

  return (
    <div className="mt-4 rounded-md bg-neutral-50 p-3">
      <p className="mb-2 text-xs font-semibold text-neutral-700">Add a product</p>
      {!product ? (
        <ProductPicker excludeIds={existingIds} onPick={setProduct} />
      ) : (
        <form action={formAction} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="poId" value={poId} />
          <input type="hidden" name="productId" value={product.id} />
          <span className="min-w-0 flex-1 truncate text-sm">{product.name}</span>
          <input name="quantity" type="number" min={1} defaultValue={1} required className={`${input} w-20`} />
          <input
            name="unitCost"
            type="number"
            min={0}
            step="0.01"
            required
            placeholder={`Unit cost (${currency === "USD" ? "$" : "₦"})`}
            className={`${input} w-36`}
          />
          <button type="submit" disabled={pending} className="rounded-full bg-brand-900 px-3 py-1.5 text-xs font-semibold text-white">
            Add
          </button>
          <button type="button" onClick={() => setProduct(null)} className="text-xs text-neutral-500">
            Change
          </button>
        </form>
      )}
      <Feedback state={state} />
    </div>
  );
}

export function ReceiveGoodsForm({
  poId,
  currency,
  exchangeRate,
  lines,
}: {
  poId: string;
  currency: Currency;
  exchangeRate: number;
  lines: { id: string; name: string; remaining: number }[];
}) {
  const [state, formAction, pending] = useActionState(receivePurchaseOrder, {});
  const open = lines.filter((l) => l.remaining > 0);

  return (
    <form action={formAction} className="rounded-lg border border-neutral-200 bg-white p-4 text-sm">
      <input type="hidden" name="poId" value={poId} />
      <p className="mb-1 font-medium text-neutral-900">Receive goods</p>
      <p className="mb-3 text-xs text-neutral-500">
        Enter what actually arrived. Stock goes up immediately and each product&apos;s average cost is updated.
      </p>
      <div className="mb-3 flex flex-col gap-1.5">
        {open.map((l) => (
          <label key={l.id} className="flex items-center justify-between gap-3">
            <span className="min-w-0 truncate text-xs">{l.name}</span>
            <span className="flex shrink-0 items-center gap-1 text-xs text-neutral-500">
              <input name={`receive_${l.id}`} type="number" min={0} max={l.remaining} defaultValue={l.remaining} className={`${input} w-20`} />
              of {l.remaining}
            </span>
          </label>
        ))}
      </div>
      {currency === "USD" && (
        <label className="mb-3 block text-xs text-neutral-500">
          Exchange rate actually paid (₦ per $1)
          <input name="exchangeRate" type="number" step="0.0001" min="0" defaultValue={exchangeRate} required className={`${input} mt-1 w-full`} />
        </label>
      )}
      <button type="submit" disabled={pending} className="rounded-full bg-green-700 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
        {pending ? "Receiving…" : "Receive into stock"}
      </button>
      <Feedback state={state} />
    </form>
  );
}

export function SupplierPaymentForm({ poId, currency }: { poId: string; currency: Currency }) {
  const [state, formAction, pending] = useActionState(recordSupplierPayment, {});
  return (
    <form action={formAction} className="mt-3 flex flex-col gap-2 rounded-md bg-neutral-50 p-3">
      <input type="hidden" name="poId" value={poId} />
      <div className="flex flex-wrap gap-2">
        <input
          name="amount"
          type="number"
          min={0}
          step="0.01"
          required
          placeholder={`Amount (${currency === "USD" ? "$" : "₦"})`}
          className={`${input} w-36`}
        />
        <input name="paidOn" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className={input} />
        <input name="method" placeholder="Method (e.g. bank transfer)" className={`${input} min-w-0 flex-1`} />
      </div>
      <input name="note" placeholder="Note (optional)" className={input} />
      <button type="submit" disabled={pending} className="self-start rounded-full bg-brand-900 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
        {pending ? "Saving…" : "Record payment"}
      </button>
      <Feedback state={state} />
    </form>
  );
}
