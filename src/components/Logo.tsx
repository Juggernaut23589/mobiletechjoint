import Image from "next/image";

// The source file (public/brand/mtj-logo-icon.png) is a wide "MTJ"
// wordmark, cropped tight to its content — 859x419, ~2.05:1. `size` sets
// the rendered HEIGHT; width follows this ratio so the mark renders at
// its real proportions instead of being squeezed into a square box
// (which is what happened before the crop: the source PNG used to be an
// 871x871 canvas with the mark sitting in a slim horizontal band in the
// middle, so a width=height box rendered it tiny and letterboxed).
const ASPECT_RATIO = 859 / 419;

/** Shared brand mark — a transparent PNG so it reads cleanly over the dark
 *  navbar, white content areas, and the staff portal alike without a second
 *  light/dark asset. */
export function Logo({
  size = 32,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src="/brand/mtj-logo-icon.png"
      alt="mobiletechjoint"
      width={Math.round(size * ASPECT_RATIO)}
      height={size}
      className={`shrink-0 object-contain ${className}`}
      priority
    />
  );
}
