"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { addBrandShelf, removeBrandShelf } from "@/app/actions/staff-brand-shelves";

/** Add/Remove button for the "Edit Shop by Brand" picker — same shape as
 *  NewArrivalToggleButton/MerchandisingToggleButton, just calling the
 *  brand-shelf actions instead of toggling a product field. */
export function BrandShelfToggleButton({
  brandId,
  active,
  disabled,
}: {
  brandId: string;
  active: boolean;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const formData = new FormData();
    formData.set("brandId", brandId);
    startTransition(async () => {
      await (active ? removeBrandShelf(formData) : addBrandShelf(formData));
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      disabled={isPending || disabled}
      onClick={handleClick}
      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${
        active ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-brand-900 text-white hover:bg-brand-700"
      }`}
    >
      {active ? "Remove" : "Add"}
    </button>
  );
}
