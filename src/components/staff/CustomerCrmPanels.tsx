"use client";

import { useActionState } from "react";
import { addCustomerNote, setCustomerTags } from "@/app/actions/staff-customers";

function Feedback({ state }: { state: { error?: string; notice?: string } }) {
  if (state.error) return <span className="text-xs text-red-600">{state.error}</span>;
  if (state.notice) return <span className="text-xs text-green-700">{state.notice}</span>;
  return null;
}

export function CustomerTagsForm({ customerId, tags }: { customerId: string; tags: string[] }) {
  const [state, formAction, pending] = useActionState(setCustomerTags, {});
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="customerId" value={customerId} />
      <input
        name="tags"
        defaultValue={tags.join(", ")}
        placeholder="e.g. wedding videographer, wholesale, lagos"
        className="min-w-0 flex-1 rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
      />
      <button type="submit" disabled={pending} className="rounded-full bg-brand-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
        {pending ? "Saving…" : "Save tags"}
      </button>
      <Feedback state={state} />
      <p className="w-full text-[11px] text-neutral-400">Separate tags with commas. Up to 10.</p>
    </form>
  );
}

export function CustomerNoteForm({ customerId }: { customerId: string }) {
  const [state, formAction, pending] = useActionState(addCustomerNote, {});
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="customerId" value={customerId} />
      <textarea
        name="body"
        rows={3}
        required
        maxLength={2000}
        placeholder="e.g. Called about the Sony A7 IV — wants to know when the 24-70 is back in stock."
        className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
      />
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="rounded-full bg-brand-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
          {pending ? "Saving…" : "Add note"}
        </button>
        <Feedback state={state} />
      </div>
    </form>
  );
}
