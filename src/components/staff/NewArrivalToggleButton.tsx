"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleMerchandisingFlag } from "@/app/actions/admin-products";

/** Add/Remove button for the New Arrivals picker — same
 *  toggleMerchandisingFlag action ProductEditForm's hero/trending buttons
 *  already use, just driving a standalone button instead of a per-product
 *  edit form field. */
export function NewArrivalToggleButton({
  productId,
  isNewArrival,
}: {
  productId: string;
  isNewArrival: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const formData = new FormData();
    formData.set("productId", productId);
    formData.set("field", "is_new_arrival");
    formData.set("nextValue", String(!isNewArrival));
    startTransition(async () => {
      await toggleMerchandisingFlag(formData);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={handleClick}
      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
        isNewArrival ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-brand-900 text-white hover:bg-brand-700"
      }`}
    >
      {isNewArrival ? "Remove" : "Add"}
    </button>
  );
}
