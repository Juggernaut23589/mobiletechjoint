"use client";

import { useActionState, useState } from "react";
import { createDiscountCode } from "@/app/actions/staff-discounts";

const input = "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm";

export function DiscountCodeForm() {
  const [state, formAction, pending] = useActionState(createDiscountCode, {});
  const [kind, setKind] = useState<"percent" | "fixed">("percent");

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-3">
      <label className="text-xs text-neutral-500">
        Code
        <input name="code" required placeholder="e.g. CREATOR10" className={`${input} uppercase`} />
      </label>
      <label className="text-xs text-neutral-500">
        Type
        <select name="kind" value={kind} onChange={(e) => setKind(e.target.value as "percent" | "fixed")} className={input}>
          <option value="percent">Percentage off</option>
          <option value="fixed">Fixed amount off (₦)</option>
        </select>
      </label>
      <label className="text-xs text-neutral-500">
        {kind === "percent" ? "Percent off" : "Amount off (₦)"}
        <input name="value" type="number" min={1} max={kind === "percent" ? 100 : undefined} step={kind === "percent" ? 1 : "0.01"} required className={input} />
      </label>
      <label className="text-xs text-neutral-500 sm:col-span-3">
        Description (internal)
        <input name="description" placeholder="e.g. Instagram creator week" className={input} />
      </label>
      <label className="text-xs text-neutral-500">
        Minimum order (₦, optional)
        <input name="minSubtotal" type="number" min={0} step="0.01" className={input} />
      </label>
      {kind === "percent" && (
        <label className="text-xs text-neutral-500">
          Maximum discount (₦, optional)
          <input name="maxDiscount" type="number" min={0} step="0.01" className={input} />
        </label>
      )}
      <label className="text-xs text-neutral-500">
        Total uses allowed (optional)
        <input name="usageLimit" type="number" min={1} className={input} />
      </label>
      <label className="text-xs text-neutral-500">
        Uses per customer (optional)
        <input name="perCustomerLimit" type="number" min={1} defaultValue={1} className={input} />
      </label>
      <label className="text-xs text-neutral-500">
        Starts (Lagos time, optional)
        <input name="startsAt" type="datetime-local" className={input} />
      </label>
      <label className="text-xs text-neutral-500">
        Ends (Lagos time, optional)
        <input name="endsAt" type="datetime-local" className={input} />
      </label>
      <div className="flex items-center gap-3 sm:col-span-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-brand-gradient px-4 py-2 text-sm font-semibold text-white shadow-glow disabled:opacity-50"
        >
          {pending ? "Creating…" : "Create code"}
        </button>
        {state.error && <span className="text-sm text-red-600">{state.error}</span>}
        {state.notice && <span className="text-sm text-green-700">{state.notice}</span>}
      </div>
      <p className="text-xs text-neutral-400 sm:col-span-3">
        Discounts come off product prices only, never delivery. A use counts once the order is paid (or
        while its checkout is still open).
      </p>
    </form>
  );
}
