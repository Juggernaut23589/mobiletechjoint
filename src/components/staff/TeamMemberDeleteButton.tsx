"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteTeamMember } from "@/app/actions/staff-team-blog";

export function TeamMemberDeleteButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`Remove ${name} from the team blog?`)) return;
    const formData = new FormData();
    formData.set("id", id);
    startTransition(async () => {
      await deleteTeamMember(formData);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={handleDelete}
      className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
    >
      {isPending ? "Removing…" : "Remove"}
    </button>
  );
}
