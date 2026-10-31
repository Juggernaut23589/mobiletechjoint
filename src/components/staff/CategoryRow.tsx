"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { renameCategory, deleteCategory } from "@/app/actions/staff-categories";
import type { CategoryWithCount } from "@/types/database";

/** One row in the category admin list — inline rename, and a delete that
 *  warns how many products will become uncategorized (categories.id is
 *  "on delete set null" on products.category_id, so nothing else is
 *  removed, but the admin should know before confirming). */
export function CategoryRow({ category }: { category: CategoryWithCount }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [error, setError] = useState<string | null>(null);

  function handleRename() {
    if (!name.trim() || name.trim() === category.name) {
      setEditing(false);
      setName(category.name);
      return;
    }
    const formData = new FormData();
    formData.set("id", category.id);
    formData.set("name", name.trim());
    startTransition(async () => {
      const result = await renameCategory(formData);
      if (result.error) setError(result.error);
      else {
        setEditing(false);
        router.refresh();
      }
    });
  }

  function handleDelete() {
    const warning =
      category.product_count > 0
        ? `Delete "${category.name}"? ${category.product_count} product${category.product_count === 1 ? "" : "s"} will become uncategorized.`
        : `Delete "${category.name}"?`;
    if (!window.confirm(warning)) return;

    const formData = new FormData();
    formData.set("id", category.id);
    startTransition(async () => {
      const result = await deleteCategory(formData);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {editing ? (
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleRename();
            if (e.key === "Escape") {
              setEditing(false);
              setName(category.name);
            }
          }}
          autoFocus
          disabled={isPending}
          className="min-w-0 flex-1 rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-neutral-900"
        />
      ) : (
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-neutral-900">{category.name}</p>
          <p className="truncate text-xs text-neutral-500">
            /{category.slug} · {category.product_count} product{category.product_count === 1 ? "" : "s"}
          </p>
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

      {editing ? (
        <button
          type="button"
          disabled={isPending}
          onClick={handleRename}
          className="shrink-0 rounded-full bg-brand-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          Save
        </button>
      ) : (
        <button
          type="button"
          disabled={isPending}
          onClick={() => setEditing(true)}
          className="shrink-0 rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-200 disabled:opacity-50"
        >
          Rename
        </button>
      )}
      <button
        type="button"
        disabled={isPending}
        onClick={handleDelete}
        className="shrink-0 rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
      >
        Delete
      </button>
    </div>
  );
}
