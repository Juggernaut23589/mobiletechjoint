import { Star } from "lucide-react";

/** Read-only star display — five icons, each filled by whatever fraction
 *  of it the rating covers (so 4.3 renders a visibly partial 5th star). */
export function StarRating({
  rating,
  size = 14,
  className = "",
}: {
  rating: number;
  size?: number;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-0.5 ${className}`} aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => {
        const fill = Math.max(0, Math.min(1, rating - (n - 1))) * 100;
        return (
          <span key={n} className="relative inline-block" style={{ width: size, height: size }}>
            <Star width={size} height={size} className="absolute inset-0 text-neutral-300" />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill}%` }}>
              <Star width={size} height={size} className="fill-accent-500 text-accent-500" />
            </span>
          </span>
        );
      })}
    </div>
  );
}
