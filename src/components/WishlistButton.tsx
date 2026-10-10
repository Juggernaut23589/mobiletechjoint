"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { useWishlistStore } from "@/store/wishlist";

/** Heart toggle for saving a product — mirrors QuickAddButton's overlay
 *  pattern (sits on the product image, stops the card's own link from
 *  firing). Not logged in: sends them to log in rather than silently
 *  failing, same principle as checkout's guest-vs-login handling. */
export function WishlistButton({
  productId,
  className = "",
  showLabel = false,
}: {
  productId: string;
  className?: string;
  /** Renders as a pill with "Save"/"Saved" text instead of an icon-only
   *  circle — used on the product page buy-box, next to Add to Cart. */
  showLabel?: boolean;
}) {
  const router = useRouter();
  const ensureLoaded = useWishlistStore((s) => s.ensureLoaded);
  const toggle = useWishlistStore((s) => s.toggle);
  const inWishlist = useWishlistStore((s) => s.productIds.has(productId));
  const [pending, setPending] = useState(false);

  useEffect(() => {
    ensureLoaded();
  }, [ensureLoaded]);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (pending) return;
    setPending(true);
    toggle(productId).then((result) => {
      setPending(false);
      if (result.error) router.push("/account/login");
    });
  }

  if (showLabel) {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        aria-pressed={inWishlist}
        className={`inline-flex items-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold transition-colors disabled:opacity-60 ${
          inWishlist
            ? "border-red-500/40 bg-red-500/10 text-red-400"
            : "border-white/20 text-white/80 hover:border-red-500/40 hover:text-red-400"
        } ${className}`}
      >
        <Heart className={`h-4 w-4 ${inWishlist ? "fill-red-400 text-red-400" : ""}`} strokeWidth={2} />
        {inWishlist ? "Saved" : "Save"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-label={inWishlist ? "Remove from wishlist" : "Save to wishlist"}
      aria-pressed={inWishlist}
      className={`flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-neutral-500 shadow-sm backdrop-blur-sm transition-colors hover:text-red-500 disabled:opacity-60 ${className}`}
    >
      <Heart className={`h-4 w-4 ${inWishlist ? "fill-red-500 text-red-500" : ""}`} strokeWidth={2} />
    </button>
  );
}
