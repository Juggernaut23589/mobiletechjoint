"use client";

import { useState, useActionState } from "react";
import { emailCustomer } from "@/app/actions/staff-disputes";

export function EmailCustomerForm({ customerEmail, orderReference }: { customerEmail: string; orderReference: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean }, formData: FormData) =>
      (await emailCustomer(formData)) ?? {},
    {}
  );

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:bg-neutral-50"
      >
        Email customer
      </button>
    );
  }

  return (
    <form action={formAction} className="mt-3 rounded-md bg-neutral-50 p-3">
      <input type="hidden" name="to" value={customerEmail} />
      <label className="mb-1 block text-xs text-neutral-500">Subject</label>
      <input
        name="subject"
        required
        defaultValue={`About your order ${orderReference}`}
        className="mb-2 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
      />
      <label className="mb-1 block text-xs text-neutral-500">Message</label>
      <textarea
        name="message"
        required
        rows={4}
        className="mb-2 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
      />
      {state.error && <p className="mb-2 text-xs text-red-600">{state.error}</p>}
      {state.success && <p className="mb-2 text-xs text-green-700">Sent.</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Sending…" : "Send"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full border border-neutral-300 px-3 py-1.5 text-xs text-neutral-600"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
