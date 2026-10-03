"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestStaffPasswordReset } from "@/app/actions/staff-auth";
import { Logo } from "@/components/Logo";

export default function StaffForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(requestStaffPasswordReset, {});

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-[380px] flex-col items-center justify-center px-4 py-10">
      <div className="mb-8 flex items-center gap-2">
        <Logo size={30} />
        <span className="font-display text-[18px] text-brand-900">
          mobile<span className="font-bold">techjoint</span>
        </span>
      </div>

      <div className="w-full rounded-[18px] border border-neutral-200 bg-white p-8">
        <h1 className="font-display mb-2 text-center text-xl text-brand-900">Reset your password</h1>
        {state.success ? (
          <p className="text-center text-sm text-neutral-600">
            If that email belongs to a staff account, a reset link is on its way. It expires in one hour
            — check your spam folder if it doesn&apos;t arrive.
          </p>
        ) : (
          <form action={formAction}>
            <p className="mb-5 text-center text-sm text-neutral-500">
              Enter your work email and we&apos;ll send you a link to choose a new password.
            </p>
            <input
              name="email"
              type="email"
              required
              autoFocus
              placeholder="you@example.com"
              className="mb-3 w-full rounded-[10px] border border-neutral-200 px-3.5 py-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            />
            {state.error && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-full bg-brand-600 py-3 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {pending ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}
      </div>

      <Link href="/staff/login" className="mt-4.5 text-[12.5px] font-semibold text-brand-600 hover:text-brand-700">
        ← Back to sign in
      </Link>
    </div>
  );
}
