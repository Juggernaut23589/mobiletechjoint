"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { adminLogin } from "@/app/actions/admin-auth";

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/admin/products";

  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string }, formData: FormData) => {
      const result = await adminLogin(formData);
      return result ?? {};
    },
    {}
  );

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-sm items-center px-4">
      <form action={formAction} className="w-full">
        <h1 className="mb-6 text-xl font-bold">Admin Login</h1>
        <input type="hidden" name="next" value={next} />
        <label htmlFor="password" className="mb-1 block text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoFocus
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
          className="w-full rounded-md bg-neutral-900 px-6 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Checking…" : "Log in"}
        </button>
      </form>
    </div>
  );
}

export default function AdminLoginPage() {
  // useSearchParams requires a Suspense boundary — confirmed against the
  // current Next.js docs bundled with this install.
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
