"use client";

import { useActionState, useSyncExternalStore } from "react";
import Link from "next/link";
import { completeAccountPasswordReset } from "@/app/actions/account";
import { AuthLayout } from "@/components/AuthLayout";
import { PasswordInput } from "@/components/PasswordInput";

const noopSubscribe = () => () => {};

/** Supabase sends the reset session in the URL fragment (#access_token=…),
 *  which browsers never send to the server — so it's read here. Same
 *  approach as the staff reset page (app/staff/reset-password/page.tsx). */
function useResetFragment() {
  const hash = useSyncExternalStore(noopSubscribe, () => window.location.hash, () => "");
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  return {
    accessToken: params.get("type") === "recovery" ? params.get("access_token") : null,
    error: params.get("error_description"),
    ready: hash !== "",
  };
}

export default function ResetPasswordPage() {
  const [state, formAction, pending] = useActionState(completeAccountPasswordReset, {});
  const { accessToken, error, ready } = useResetFragment();
  const input = "mb-3 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900";

  let body: React.ReactNode;
  if (state.notice) {
    body = (
      <div className="text-sm text-neutral-600">
        <p className="mb-4">{state.notice}</p>
        <Link href="/account/login" className="font-medium text-brand-600 hover:underline">
          Sign in →
        </Link>
      </div>
    );
  } else if (!accessToken) {
    body = (
      <p className="text-sm text-neutral-600">
        {ready && error
          ? `${error.replace(/\+/g, " ")}. `
          : "This page only works from the link in a password-reset email. "}
        <Link href="/account/forgot-password" className="font-medium text-brand-600 hover:underline">
          Request a new link
        </Link>
        .
      </p>
    );
  } else {
    body = (
      <form action={formAction} className="w-full">
        <input type="hidden" name="accessToken" value={accessToken} />
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-neutral-800">
          New password
        </label>
        <PasswordInput id="password" name="password" required minLength={8} className={input} />
        <label htmlFor="confirm" className="mb-1 block text-sm font-medium text-neutral-800">
          Confirm new password
        </label>
        <PasswordInput id="confirm" name="confirm" required minLength={8} className={input} />
        <p className="mb-3 text-xs text-neutral-400">At least 8 characters.</p>
        {state.error && (
          <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-brand-700 px-6 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Saving…" : "Set new password"}
        </button>
      </form>
    );
  }

  return (
    <AuthLayout>
      <h1 className="mb-6 text-xl font-bold text-brand-900">Choose a new password</h1>
      {body}
    </AuthLayout>
  );
}
