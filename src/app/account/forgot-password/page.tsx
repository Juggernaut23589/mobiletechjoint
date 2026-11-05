"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestAccountPasswordReset } from "@/app/actions/account";
import { AuthLayout } from "@/components/AuthLayout";

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(requestAccountPasswordReset, {});

  return (
    <AuthLayout>
      <h1 className="mb-1 text-xl font-bold text-brand-900">Reset your password</h1>

      {state.notice ? (
        <p className="mb-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{state.notice}</p>
      ) : (
        <form action={formAction} className="w-full">
          <p className="mb-6 text-sm text-neutral-500">
            Enter your email and we&apos;ll send you a link to choose a new password.
          </p>

          <label htmlFor="email" className="mb-1 block text-sm font-medium text-neutral-800">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoFocus
            className="mb-3 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
          />

          {state.error && (
            <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-brand-700 px-6 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {pending ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}

      <Link
        href="/account/login"
        className="mt-4 block text-center text-sm font-medium text-brand-600 hover:underline"
      >
        ← Back to sign in
      </Link>
    </AuthLayout>
  );
}
