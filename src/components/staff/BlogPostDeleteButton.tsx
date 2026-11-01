"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteBlogPost } from "@/app/actions/staff-blog";

export function BlogPostDeleteButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm(`Delete "${title}"? This can't be undone.`)) return;
    const formData = new FormData();
    formData.set("id", id);
    startTransition(async () => {
      await deleteBlogPost(formData);
      router.push("/staff/dashboard/blog");
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={handleDelete}
      className="rounded-full bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
    >
      {isPending ? "Deleting…" : "Delete post"}
    </button>
  );
}
