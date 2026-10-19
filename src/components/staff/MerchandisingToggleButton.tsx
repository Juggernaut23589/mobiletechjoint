"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleMerchandisingFlag } from "@/app/actions/admin-products";

/** Generic Add/Remove button for the Hot Selling and Deals curation
 *  screens — same toggleMerchandisingFlag action NewArrivalToggleButton
 *  and ProductEditForm's hero/trending buttons already use, just driving
 *  any of the three remaining boolean fields from a standalone button. */
export function MerchandisingToggleButton({
  productId,
  field,
  active,
}: {
  productId: string;
  field: "is_featured" | "is_deal";
  active: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const formData = new FormData();
    formData.set("productId", productId);
    formData.set("field", field);
    formData.set("nextValue", String(!active));
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
        active ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-brand-900 text-white hover:bg-brand-700"
      }`}
    >
      {active ? "Remove" : "Add"}
    </button>
  );
}
