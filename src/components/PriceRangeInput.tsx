"use client";

import { useState } from "react";
import { formatNaira } from "@/lib/money";

/** Range slider with a live label — submitted via the surrounding filter
 *  form's Apply button (works without JS too; the label just won't live-
 *  update until the page reloads with the new value). */
export function PriceRangeInput({ max, initial }: { max: number; initial: number }) {
  const [value, setValue] = useState(initial);

  if (max <= 0) return null;

  return (
    <div>
      <input
        type="range"
        name="maxPrice"
        min={0}
        max={max}
        step={Math.max(1000, Math.round(max / 200))}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="mb-2.5 w-full accent-brand-600"
      />
      <div className="flex items-center gap-2 text-xs text-neutral-500">
        <span className="flex-1 rounded-md border border-neutral-200 px-2 py-1.5 text-center">
          {formatNaira(0)}
        </span>
        <span>–</span>
        <span className="flex-1 rounded-md border border-neutral-200 px-2 py-1.5 text-center">
          {formatNaira(value)}
        </span>
      </div>
    </div>
  );
}
