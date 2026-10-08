import { BadgeCheck } from "lucide-react";
import { getApprovedReviews } from "@/lib/reviews";
import { getMyReviewForProduct } from "@/app/actions/reviews";
import { getCurrentUser } from "@/app/actions/account";
import { StarRating } from "@/components/StarRating";
import { ReviewForm } from "@/components/ReviewForm";

export async function ReviewsSection({
  productId,
  slug,
  ratingAvg,
  ratingCount,
}: {
  productId: string;
  slug: string;
  ratingAvg: number | null;
  ratingCount: number;
}) {
  const [reviews, user, myReview] = await Promise.all([
    getApprovedReviews(productId),
    getCurrentUser(),
    getMyReviewForProduct(productId),
  ]);

  return (
    <section id="reviews" className="mt-14 max-w-3xl border-t border-white/10 pt-10">
      <h2 className="font-display mb-5 text-xl font-bold text-white">Reviews</h2>

      <div className="mb-7 flex items-center gap-3">
        {ratingCount > 0 && ratingAvg !== null ? (
          <>
            <StarRating rating={ratingAvg} size={18} />
            <span className="text-sm font-semibold text-white">{ratingAvg.toFixed(1)}</span>
            <span className="text-sm text-white/50">
              · {ratingCount} review{ratingCount === 1 ? "" : "s"}
            </span>
          </>
        ) : (
          <span className="text-sm text-white/50">No reviews yet — be the first.</span>
        )}
      </div>

      {reviews.length > 0 && (
        <div className="mb-8 flex flex-col gap-6">
          {reviews.map((r) => (
            <div key={r.id} className="border-b border-white/10 pb-6 last:border-0">
              <div className="mb-1.5 flex items-center gap-2.5">
                <StarRating rating={r.rating} />
                {r.is_verified_purchase && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#16C784]">
                    <BadgeCheck className="h-3.5 w-3.5" /> Verified purchase
                  </span>
                )}
              </div>
              {r.title && (
                <h3 className="mb-1 text-[14px] font-semibold text-white">{r.title}</h3>
              )}
              <p className="mb-2 whitespace-pre-line text-[13.5px] leading-relaxed text-white/60">
                {r.body}
              </p>
              <p className="text-xs text-white/35">
                {r.reviewer_name} ·{" "}
                {new Date(r.created_at).toLocaleDateString("en-NG", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
          ))}
        </div>
      )}

      <ReviewForm productId={productId} slug={slug} isLoggedIn={Boolean(user)} myReview={myReview} />
    </section>
  );
}
