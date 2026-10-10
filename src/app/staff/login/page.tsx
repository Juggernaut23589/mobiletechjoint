"use client";

import { useActionState, Suspense } from "react";
import Link from "next/link";
import { loginStaff } from "@/app/actions/staff-auth";
import { STAFF_ABILITIES } from "@/lib/staff-auth";
import { Logo } from "@/components/Logo";

function LoginForm() {
  const [state, formAction, pending] = useActionState(loginStaff, {});

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-[380px] flex-col items-center justify-center px-4 py-10">
      <div className="mb-8 flex items-center gap-2">
        <Logo size={30} />
        <span className="font-display text-[18px] text-white">
          mobile<span className="font-bold">techjoint</span>
        </span>
      </div>

      <div className="w-full rounded-[18px] border border-neutral-200 bg-white p-8">
        <div className="mb-6 text-center">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-brand-600">
            Staff Portal
          </div>
          <h1 className="font-display text-xl text-brand-900">Sign in to the dashboard</h1>
        </div>

        <form action={formAction}>
          <div className="mb-4">
            <label htmlFor="email" className="mb-1.5 block text-[12.5px] font-semibold text-neutral-700">
              Work Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoFocus
              placeholder="you@mobiletechjoint.com"
              className="w-full rounded-[10px] border border-neutral-200 px-3.5 py-3 text-sm text-neutral-900 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <div className="mb-1">
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="password" className="block text-[12.5px] font-semibold text-neutral-700">
                Password
              </label>
              <Link href="/staff/forgot-password" className="text-[12px] font-semibold text-brand-600 hover:text-brand-700">
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              required
              placeholder="••••••••"
              className="w-full rounded-[10px] border border-neutral-200 px-3.5 py-3 text-sm text-neutral-900 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            />
          </div>

          {state.error && (
            <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="mt-4.5 w-full rounded-full bg-brand-600 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            {pending ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <div className="mt-6 border-t border-neutral-200 pt-4.5 text-center">
          <p className="mb-2.5 text-xs text-neutral-500">
            Access is granted per role by a super admin
          </p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {STAFF_ABILITIES.slice(0, 4).map((a) => (
              <span
                key={a.key}
                className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-[11px] font-semibold text-neutral-500"
              >
                {a.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-4.5 text-[12.5px] text-white/50">
        New staff member? Ask an admin for an invite link.
      </p>
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
