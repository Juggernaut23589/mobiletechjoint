"use client";

import { useActionState } from "react";
import { subscribeToNewsletter } from "@/app/actions/newsletter";

export function NewsletterForm() {
  const [state, formAction, pending] = useActionState(subscribeToNewsletter, {});

  return (
    <div className="mx-auto max-w-[440px]">
      {state.success ? (
        <p className="text-sm text-white/70">You&apos;re subscribed. Watch your inbox.</p>
      ) : (
        <form action={formAction} className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <input
            type="email"
            name="email"
            required
            placeholder="you@email.com"
            className="flex-1 rounded-full border border-white/10 bg-[#181C26] px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-brand-600"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-accent-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-600 disabled:opacity-50"
          >
            {pending ? "Subscribing…" : "Subscribe"}
          </button>
        </form>
      )}
      {state.error && <p className="mt-2 text-sm text-red-400">{state.error}</p>}
    </div>
  );
}
