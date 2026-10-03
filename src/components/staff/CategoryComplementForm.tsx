"use client";

import { useActionState } from "react";
import { addCategoryComplement } from "@/app/actions/admin-crosssells";
import type { Category } from "@/types/database";

export function CategoryComplementForm({ categories }: { categories: Category[] }) {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string }, formData: FormData) =>
      (await addCategoryComplement(formData)) ?? {},
    {}
  );

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4 sm:flex-row sm:items-end">
      <div className="flex-1">
        <label className="mb-1 block text-xs text-neutral-500">When viewing</label>
        <select
          name="categoryId"
          required
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        >
          <option value="">Select category…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex-1">
        <label className="mb-1 block text-xs text-neutral-500">show cross-sells from</label>
        <select
          name="complementCategoryId"
          required
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        >
          <option value="">Select category…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add pairing"}
      </button>
      {state.error && <p className="text-sm text-red-600 sm:basis-full">{state.error}</p>}
    </form>
  );
}
