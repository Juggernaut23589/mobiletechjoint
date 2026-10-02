import Image from "next/image";

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
      width={size}
      height={size}
      className={`shrink-0 object-contain ${className}`}
      priority
    />
  );
}
