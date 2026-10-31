"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCategory } from "@/app/actions/staff-categories";

export function NewCategoryForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createCategory(formData);
      if (result.error) setError(result.error);
      else {
        formRef.current?.reset();
        router.refresh();
      }
    });
  }

  return (
    <form ref={formRef} action={handleSubmit} className="flex flex-wrap items-start gap-2">
      <input
        type="text"
        name="name"
        placeholder="New category name…"
        disabled={isPending}
        className="min-w-0 flex-1 basis-56 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400"
      />
      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-brand-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {isPending ? "Adding…" : "Add category"}
      </button>
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </form>
  );
}
