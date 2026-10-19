"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { addHeroBrand, removeHeroBrand } from "@/app/actions/staff-hero-brands";

/** Add/Remove button for the hero carousel's brand showcase picker on the
 *  "Customize Banner" screen — same shape as BrandShelfToggleButton, just
 *  calling the hero-brand actions instead of the Shop by Brand ones. */
export function HeroBrandToggleButton({
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
      await (active ? removeHeroBrand(formData) : addHeroBrand(formData));
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
