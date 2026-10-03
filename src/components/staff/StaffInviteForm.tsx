"use client";

import { useActionState, useState } from "react";
import { createStaffInvite } from "@/app/actions/staff-team";

export function StaffInviteForm() {
  const [state, formAction, pending] = useActionState(createStaffInvite, {});
  const [copied, setCopied] = useState(false);

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <h2 className="mb-1 text-sm font-semibold text-neutral-900">Invite a staff member</h2>
      <p className="mb-3 text-xs text-neutral-500">
        Staff can only register through an invite link. Links expire after 7 days and only work
        for the email they were created for.
      </p>
      <form action={formAction} className="flex flex-wrap gap-2">
        <input
          name="email"
          type="email"
          required
          placeholder="name@example.com"
          className="min-w-0 flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-brand-gradient px-4 py-2 text-sm font-semibold text-white shadow-glow disabled:opacity-50"
        >
          {pending ? "Creating…" : "Create invite"}
        </button>
      </form>

      {state.error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      {state.link && (
        <div className="mt-3 rounded-md bg-neutral-50 p-3 text-xs">
          <p className="mb-2 text-neutral-600">
            {state.emailed
              ? "Invite emailed. You can also share this link directly:"
              : "Email isn't configured, so share this link with them directly (e.g. WhatsApp):"}
          </p>
          <div className="flex gap-2">
            <input
              readOnly
              value={state.link}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 rounded border border-neutral-200 bg-white px-2 py-1.5 font-mono text-[11px]"
            />
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(state.link!);
                setCopied(true);
              }}
              className="rounded-full border border-neutral-300 px-3 py-1 font-medium hover:bg-white"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
