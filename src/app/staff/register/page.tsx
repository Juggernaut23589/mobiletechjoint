"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerStaff } from "@/app/actions/staff-auth";

export default function StaffRegisterPage() {
  const [state, formAction, pending] = useActionState(registerStaff, {});

  if (state.success) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col items-center justify-center px-4 py-8 text-center">
        <h1 className="mb-2 text-xl font-bold text-brand-900">Account created</h1>
        <p className="mb-6 text-sm text-neutral-500">
          A super admin needs to approve your account before you can log in. You&apos;ll be able
          to sign in once that happens.
        </p>
        <Link href="/staff/login" className="text-sm font-medium text-brand-600 hover:underline">
          Go to staff login
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm items-center px-4 py-8">
      <form action={formAction} className="w-full">
        <h1 className="mb-1 text-xl font-bold text-brand-900">Staff registration</h1>
        <p className="mb-6 text-sm text-neutral-500">
          Already have an account?{" "}
          <Link href="/staff/login" className="font-medium text-brand-600 hover:underline">
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

        <label htmlFor="jobTitle" className="mb-1 block text-sm font-medium">
          Job title
        </label>
        <input
          id="jobTitle"
          name="jobTitle"
          required
          placeholder="e.g. Inventory Assistant"
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
          className="w-full rounded-full bg-brand-gradient px-6 py-2.5 text-sm font-semibold text-white shadow-glow disabled:opacity-50"
        >
          {pending ? "Creating account…" : "Register"}
        </button>
      </form>
    </div>
  );
}
