"use client";

import { useState } from "react";

/** Full manufacturer description, placed under the SKU/Category line in
 *  the buy box (moved off sitting beside the gallery — some products'
 *  migrated copy ran to 40+ lines and visually dwarfed the product photo
 *  next to it). Clamped to 10 lines by default with a Read more/less
 *  toggle — line-clamp needs client state to toggle, so this is its own
 *  small client component rather than inline in the (server) product
 *  page. */
export function ProductDescription({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-6 border-t border-ink/10 pt-5">
      <h2 className="mb-2.5 text-sm font-semibold text-ink">Full description</h2>
      <p
        className={`whitespace-pre-line text-sm leading-relaxed text-ink/60 ${expanded ? "" : "line-clamp-[10]"}`}
      >
        {text}
      </p>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-2 text-[13px] font-semibold text-link hover:underline"
      >
        {expanded ? "Read less" : "Read more"}
      </button>
    </div>
  );
}
