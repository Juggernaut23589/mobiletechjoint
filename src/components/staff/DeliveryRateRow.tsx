"use client";

import { useState, useTransition } from "react";
import { updateDeliveryRate } from "@/app/actions/staff-deliveries";
import { formatNaira } from "@/lib/money";
import type { DeliveryRate } from "@/lib/delivery";

export function DeliveryRateRow({ rate }: { rate: DeliveryRate }) {
  const [value, setValue] = useState(rate.price_kobo / 100);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function save() {
    const formData = new FormData();
    formData.set("state", rate.state);
    formData.set("priceNaira", String(value));
    startTransition(async () => {
      await updateDeliveryRate(formData);
      setSaved(true);
      setTimeout(() => setSaved(false), 1200);
    });
  }

  const unpriced = rate.price_kobo === 0;

  return (
    <div className="flex items-center gap-3 border-b border-neutral-200 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{rate.state}</p>
        {unpriced && <p className="text-xs text-amber-600">Not priced yet</p>}
      </div>
      <span className="text-xs text-neutral-400">{formatNaira(rate.price_kobo)}</span>
      <input
        type="number"
        min={0}
        step="1"
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="w-24 rounded-md border border-neutral-300 px-2 py-1 text-sm"
      />
      <button
        type="button"
        disabled={isPending || value * 100 === rate.price_kobo}
        onClick={save}
        className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
      >
        {saved ? "Saved ✓" : isPending ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
