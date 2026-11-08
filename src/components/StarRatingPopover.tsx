"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { StarRating } from "@/components/StarRating";
import type { RatingBreakdown } from "@/lib/reviews";

/** Clickable star rating: tapping the stars opens a small portal-rendered
 *  panel with a horizontal bar graph of how many 1-5 star reviews a
 *  product has. Used on ProductCard and the product page — same component,
 *  same dropdown, everywhere a rating shows. Rendered via a portal so it
 *  is never clipped by a card's own `overflow-hidden` (ProductCard's root
 *  has that for its rounded corners) and never fights a card's z-index.
 *
 *  Nested inside ProductCard's own wrapping <Link>, the same way
 *  WishlistButton already is — stopPropagation/preventDefault keep a star
 *  click from also triggering the card's navigation. */
export function StarRatingPopover({
  productId,
  rating,
  count,
  size = 14,
  showCount = true,
  countClassName = "text-[10.5px] text-white/40",
}: {
  productId: string;
  rating: number;
  count: number;
  size?: number;
  showCount?: boolean;
  countClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<RatingBreakdown | null>(null);
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        btnRef.current &&
        !btnRef.current.contains(target) &&
        panelRef.current &&
        !panelRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function handleToggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const panelWidth = 260;
      setCoords({
        top: r.bottom + 8,
        left: Math.min(Math.max(8, r.left), window.innerWidth - panelWidth - 8),
      });
      if (!data && !loading) {
        setLoading(true);
        fetch(`/api/products/${productId}/rating-breakdown`)
          .then((res) => res.json())
          .then((json: { breakdown?: RatingBreakdown }) => {
            if (json.breakdown) setData(json.breakdown);
          })
          .catch(() => {})
          .finally(() => setLoading(false));
      }
    }
    setOpen((o) => !o);
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={handleToggle}
        className="flex items-center gap-1.5"
        aria-expanded={open}
        aria-label={`${rating.toFixed(1)} out of 5 stars, ${count} rating${count === 1 ? "" : "s"}. Click to see the breakdown.`}
      >
        <StarRating rating={rating} size={size} />
        {showCount && <span className={countClassName}>({count})</span>}
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={panelRef}
            className="fixed z-[100] w-[260px] rounded-xl border border-neutral-200 bg-white p-4 shadow-2xl"
            style={{ top: coords.top, left: coords.left }}
          >
            <div className="mb-3 flex items-center gap-2">
              <span className="text-lg font-bold text-neutral-900">{rating.toFixed(1)}</span>
              <StarRating rating={rating} size={13} />
            </div>
            <p className="mb-3 text-xs text-neutral-500">
              {count} rating{count === 1 ? "" : "s"}
            </p>
            {loading && !data ? (
              <p className="py-2 text-xs text-neutral-400">Loading…</p>
            ) : (
              [5, 4, 3, 2, 1].map((star) => {
                const c = data?.counts[star as 1 | 2 | 3 | 4 | 5] ?? 0;
                const pct = data && data.total > 0 ? (c / data.total) * 100 : 0;
                return (
                  <div key={star} className="mb-1.5 flex items-center gap-2 text-xs last:mb-0">
                    <span className="w-2.5 shrink-0 font-medium text-neutral-600">{star}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
                      <div
                        className="h-full rounded-full bg-accent-500 transition-[width]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-5 shrink-0 text-right text-neutral-400">{c}</span>
                  </div>
                );
              })
            )}
          </div>,
          document.body
        )}
    </>
  );
}
