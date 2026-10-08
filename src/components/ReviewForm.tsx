"use client";

import { useActionState, useState } from "react";
import { Star } from "lucide-react";
import { submitProductReview } from "@/app/actions/reviews";
import type { ProductReview } from "@/types/database";

export function ReviewForm({
  productId,
  slug,
  isLoggedIn,
  myReview,
}: {
  productId: string;
  slug: string;
  isLoggedIn: boolean;
  myReview: ProductReview | null;
}) {
  const [state, formAction, pending] = useActionState(submitProductReview, {});
  const [rating, setRating] = useState(myReview?.rating ?? 0);
  const [hoverRating, setHoverRating] = useState(0);

  if (!isLoggedIn) {
    return (
      <div className="rounded-[14px] border border-white/10 bg-white/[0.03] px-4 py-3.5 text-[13.5px] text-white/60">
        <a href="/account/login" className="font-semibold text-accent-400 hover:text-white">
          Log in
        </a>{" "}
        to write a review.
      </div>
    );
  }

  const shownRating = hoverRating || rating;

  return (
    <form action={formAction} className="rounded-[14px] border border-white/10 p-5">
      <h3 className="mb-3 text-sm font-semibold text-white">
        {myReview ? "Edit your review" : "Write a review"}
      </h3>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="rating" value={rating} />

      <div className="mb-3.5 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            onMouseEnter={() => setHoverRating(n)}
            onMouseLeave={() => setHoverRating(0)}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            className="p-0.5"
          >
            <Star
              className={n <= shownRating ? "fill-accent-500 text-accent-500" : "text-white/20"}
              width={22}
              height={22}
            />
          </button>
        ))}
      </div>

      <label htmlFor="review-title" className="mb-1 block text-xs font-semibold text-white/70">
        Title (optional)
      </label>
      <input
        id="review-title"
        name="title"
        defaultValue={myReview?.title ?? ""}
        maxLength={120}
        className="mb-3 w-full rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30"
      />

      <label htmlFor="review-body" className="mb-1 block text-xs font-semibold text-white/70">
        Your review
      </label>
      <textarea
        id="review-body"
        name="body"
        required
        rows={4}
        defaultValue={myReview?.body ?? ""}
        placeholder="What did you use it for, and what stood out?"
        className="mb-3 w-full rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30"
      />

      {state.error && (
        <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      {state.notice && (
        <p className="mb-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          {state.notice}
        </p>
      )}
      {myReview?.status === "pending" && !state.notice && (
        <p className="mb-3 text-xs text-white/50">
          Your review is awaiting approval and isn&apos;t public yet.
        </p>
      )}
      {myReview?.status === "rejected" && !state.notice && (
        <p className="mb-3 text-xs text-white/50">
          This review wasn&apos;t approved for publication. Editing and resubmitting sends it back
          for another look.
        </p>
      )}

      <button
        type="submit"
        disabled={pending || rating === 0}
        className="rounded-full bg-accent-500 px-5 py-2.5 text-sm font-semibold text-brand-900 disabled:opacity-50"
      >
        {pending ? "Submitting…" : myReview ? "Update review" : "Submit review"}
      </button>
    </form>
  );
}
