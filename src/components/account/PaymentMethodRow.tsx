"use client";

import { useTransition } from "react";
import { deletePaymentMethod, setDefaultPaymentMethod } from "@/app/actions/payment-methods";
import type { SavedPaymentMethod } from "@/types/database";

export function PaymentMethodRow({ method }: { method: SavedPaymentMethod }) {
  const [isPending, startTransition] = useTransition();

  function submit(action: (formData: FormData) => Promise<{ error?: string }>) {
    const formData = new FormData();
    formData.set("id", method.id);
    startTransition(() => {
      action(formData);
    });
  }

  return (
    <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium capitalize">
          {method.card_type ?? "Card"} •••• {method.last4 ?? "****"}
          {method.is_default && (
            <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
              Default
            </span>
          )}
        </p>
        <p className="text-xs text-neutral-500">
          {method.bank ? `${method.bank} · ` : ""}
          Expires {method.exp_month}/{method.exp_year}
        </p>
      </div>
      <div className="flex gap-3">
        {!method.is_default && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => submit(setDefaultPaymentMethod)}
            className="text-sm font-medium text-brand-600 hover:underline disabled:opacity-50"
          >
            Make default
          </button>
        )}
        <button
          type="button"
          disabled={isPending}
          onClick={() => submit(deletePaymentMethod)}
          className="text-sm text-neutral-400 hover:text-red-600 disabled:opacity-50"
        >
          Remove
        </button>
      </div>
    </div>
  );
}
