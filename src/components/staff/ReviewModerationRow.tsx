"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { StarRating } from "@/components/StarRating";
import { approveReview, rejectReview } from "@/app/actions/staff-reviews";

export interface ReviewRowData {
  id: string;
  reviewerName: string;
  rating: number;
  title: string | null;
  body: string;
  isVerifiedPurchase: boolean;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  productName: string;
  productSlug: string;
}

export function ReviewModerationRow({ review }: { review: ReviewRowData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function approve() {
    const formData = new FormData();
    formData.set("id", review.id);
    startTransition(async () => {
      await approveReview(formData);
      router.refresh();
    });
  }

  function reject() {
    const note = window.prompt("Reason for rejecting this review (shown to staff only):") ?? "";
    const formData = new FormData();
    formData.set("id", review.id);
    formData.set("note", note);
    startTransition(async () => {
      await rejectReview(formData);
      router.refresh();
    });
  }

  const statusColor =
    review.status === "approved"
      ? "bg-green-100 text-green-700"
      : review.status === "rejected"
        ? "bg-red-100 text-red-600"
        : "bg-amber-100 text-amber-700";

  return (
    <div className="flex flex-col gap-2 border-b border-neutral-200 py-4 last:border-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <StarRating rating={review.rating} />
          <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase ${statusColor}`}>
            {review.status}
          </span>
          {review.isVerifiedPurchase && (
            <span className="text-[11px] font-semibold text-[#16C784]">Verified purchase</span>
          )}
        </div>
        {review.status === "pending" && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isPending}
              onClick={approve}
              className="text-sm font-semibold text-green-700 hover:text-green-900 disabled:opacity-50"
            >
              Approve
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={reject}
              className="text-sm font-semibold text-red-600 hover:text-red-800 disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        )}
      </div>
      <a
        href={`/products/${review.productSlug}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs font-semibold text-brand-700 hover:underline"
      >
        {review.productName}
      </a>
      {review.title && <p className="text-sm font-semibold text-neutral-900">{review.title}</p>}
      <p className="whitespace-pre-line text-sm text-neutral-600">{review.body}</p>
      <p className="text-xs text-neutral-400">
        {review.reviewerName} ·{" "}
        {new Date(review.createdAt).toLocaleDateString("en-NG", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
      </p>
    </div>
  );
}
