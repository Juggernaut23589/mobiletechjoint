"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUp } from "@/app/actions/account";

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string }, formData: FormData) => (await signUp(formData)) ?? {},
    {}
  );

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm items-center px-4 py-8">
      <form action={formAction} className="w-full">
        <h1 className="mb-1 text-xl font-bold text-brand-900">Create an account</h1>
        <p className="mb-6 text-sm text-neutral-500">
          Already have one?{" "}
          <Link href="/account/login" className="font-medium text-brand-600 hover:underline">
            Log in
          </Link>
        </p>

        <label htmlFor="fullName" className="mb-1 block text-sm font-medium">
          Full name
        </label>
        <input
          id="fullName"
          name="fullName"
          required
          autoFocus
          className="mb-3 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />

        <label htmlFor="email" className="mb-1 block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="mb-3 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />

        <label htmlFor="phone" className="mb-1 block text-sm font-medium">
          Phone number
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          className="mb-3 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />

        <label htmlFor="password" className="mb-1 block text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          className="mb-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
        <p className="mb-3 text-xs text-neutral-400">At least 8 characters.</p>

        {state.error && (
          <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-accent-500 px-6 py-2.5 text-sm font-semibold text-brand-900 disabled:opacity-50"
        >
          {pending ? "Creating account…" : "Create account"}
        </button>
      </form>
    </div>
  );
}
