"use client";

import { useActionState, useSyncExternalStore } from "react";
import Link from "next/link";
import { completeStaffPasswordReset } from "@/app/actions/staff-auth";
import { Logo } from "@/components/Logo";

const noopSubscribe = () => () => {};

/** Supabase sends the reset session in the URL fragment (#access_token=…),
 *  which browsers never send to the server — so it's read here. */
function useResetFragment() {
  const hash = useSyncExternalStore(noopSubscribe, () => window.location.hash, () => "");
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  return {
    accessToken: params.get("type") === "recovery" ? params.get("access_token") : null,
    error: params.get("error_description"),
    ready: hash !== "",
  };
}

export default function StaffResetPasswordPage() {
  const [state, formAction, pending] = useActionState(completeStaffPasswordReset, {});
  const { accessToken, error, ready } = useResetFragment();
  const input =
    "mb-3 w-full rounded-[10px] border border-neutral-200 px-3.5 py-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100";

  let body: React.ReactNode;
  if (state.success) {
    body = (
      <div className="text-center text-sm text-neutral-600">
        <p className="mb-4">Your password has been changed.</p>
        <Link href="/staff/login" className="font-semibold text-brand-600 hover:text-brand-700">
          Sign in →
        </Link>
      </div>
    );
  } else if (!accessToken) {
    body = (
      <p className="text-center text-sm text-neutral-600">
        {ready && error
          ? `${error.replace(/\+/g, " ")}. `
          : "This page only works from the link in a password-reset email. "}
        <Link href="/staff/forgot-password" className="font-semibold text-brand-600">
          Request a new link
        </Link>
        .
      </p>
    );
  } else {
    body = (
      <form action={formAction}>
        <input type="hidden" name="accessToken" value={accessToken} />
        <label htmlFor="password" className="mb-1.5 block text-[12.5px] font-semibold text-neutral-700">
          New password
        </label>
        <input id="password" name="password" type="password" required minLength={8} autoFocus className={input} />
        <label htmlFor="confirm" className="mb-1.5 block text-[12.5px] font-semibold text-neutral-700">
          Confirm new password
        </label>
        <input id="confirm" name="confirm" type="password" required minLength={8} className={input} />
        <p className="mb-3 text-xs text-neutral-400">At least 8 characters.</p>
        {state.error && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-full bg-brand-600 py-3 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Set new password"}
        </button>
      </form>
    );
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-[380px] flex-col items-center justify-center px-4 py-10">
      <div className="mb-8 flex items-center gap-2">
        <Logo size={30} />
        <span className="font-display text-[18px] text-brand-900">
          mobile<span className="font-bold">techjoint</span>
        </span>
      </div>
      <div className="w-full rounded-[18px] border border-neutral-200 bg-white p-8">
        <h1 className="font-display mb-5 text-center text-xl text-brand-900">Choose a new password</h1>
        {body}
      </div>
    </div>
  );
}
