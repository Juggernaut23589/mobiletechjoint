"use client";

import { useActionState, Suspense } from "react";
import Link from "next/link";
import { loginStaff } from "@/app/actions/staff-auth";

function LoginForm() {
  const [state, formAction, pending] = useActionState(loginStaff, {});

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm items-center px-4 py-8">
      <form action={formAction} className="w-full">
        <h1 className="mb-1 text-xl font-bold text-brand-900">Staff login</h1>
        <p className="mb-6 text-sm text-neutral-500">
          New here?{" "}
          <Link href="/staff/register" className="font-medium text-brand-600 hover:underline">
            Register
          </Link>
        </p>

        <label htmlFor="email" className="mb-1 block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoFocus
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
          className="mb-3 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />

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
          {pending ? "Logging in…" : "Log in"}
        </button>
      </form>
    </div>
  );
}

export default function StaffLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
