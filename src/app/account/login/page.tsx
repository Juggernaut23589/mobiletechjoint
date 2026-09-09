"use client";

import { useActionState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "@/app/actions/account";

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/account";

  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string }, formData: FormData) => (await signIn(formData)) ?? {},
    {}
  );

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm items-center px-4 py-8">
      <form action={formAction} className="w-full">
        <h1 className="mb-1 text-xl font-bold text-brand-900">Log in</h1>
        <p className="mb-6 text-sm text-neutral-500">
          New here?{" "}
          <Link href="/account/signup" className="font-medium text-brand-600 hover:underline">
            Create an account
          </Link>
        </p>
        <input type="hidden" name="next" value={next} />

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
          className="w-full rounded-md bg-brand-700 px-6 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Logging in…" : "Log in"}
        </button>
      </form>
    </div>
  );
}

export default function AccountLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
