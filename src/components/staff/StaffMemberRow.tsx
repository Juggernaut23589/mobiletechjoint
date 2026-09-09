"use client";

import { useState, useTransition } from "react";
import {
  approveStaffMember,
  deactivateStaffMember,
  updateStaffRole,
  updateStaffAbilities,
} from "@/app/actions/staff-team";
import { STAFF_ABILITIES } from "@/lib/staff-auth";
import type { StaffProfile } from "@/types/database";

export function StaffMemberRow({
  member,
  currentUserId,
}: {
  member: StaffProfile;
  currentUserId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);
  const isSelf = member.id === currentUserId;

  function run(action: (formData: FormData) => Promise<{ error?: string }>, extra?: FormData) {
    const formData = extra ?? new FormData();
    formData.set("staffId", member.id);
    startTransition(() => {
      action(formData);
    });
  }

  function handleAbilitiesSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    run(updateStaffAbilities, formData);
  }

  return (
    <div className="p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            {member.full_name}{" "}
            {isSelf && <span className="text-xs text-neutral-400">(you)</span>}
          </p>
          <p className="text-xs text-neutral-500">
            {member.job_title ?? "—"} · {member.email}
          </p>
        </div>

        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            member.role === "super_admin" ? "bg-brand-100 text-brand-700" : "bg-neutral-100 text-neutral-600"
          }`}
        >
          {member.role === "super_admin" ? "Super Admin" : "Staff"}
        </span>

        {member.is_pending ? (
          <button
            type="button"
            disabled={isPending}
            onClick={() => run(approveStaffMember)}
            className="rounded-full bg-brand-gradient px-3 py-1 text-xs font-semibold text-white shadow-glow disabled:opacity-50"
          >
            Approve
          </button>
        ) : (
          <>
            {!isSelf && (
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  run(updateStaffRole, (() => {
                    const fd = new FormData();
                    fd.set("role", member.role === "super_admin" ? "staff" : "super_admin");
                    return fd;
                  })())
                }
                className="rounded-full border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-50"
              >
                {member.role === "super_admin" ? "Demote to Staff" : "Promote to Super Admin"}
              </button>
            )}
            {member.role !== "super_admin" && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="rounded-full border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
              >
                {expanded ? "Hide abilities" : "Edit abilities"}
              </button>
            )}
            {!isSelf && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => run(deactivateStaffMember)}
                className="text-xs text-neutral-400 hover:text-red-600 disabled:opacity-50"
              >
                {member.is_active ? "Deactivate" : "Reactivate"}
              </button>
            )}
          </>
        )}
      </div>

      {expanded && member.role !== "super_admin" && (
        <form onSubmit={handleAbilitiesSubmit} className="mt-3 rounded-md bg-neutral-50 p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            {STAFF_ABILITIES.map((ability) => (
              <label key={ability.key} className="flex items-start gap-2 text-xs">
                <input
                  type="checkbox"
                  name={`ability_${ability.key}`}
                  defaultChecked={Boolean(member.abilities?.[ability.key])}
                  className="mt-0.5"
                />
                <span>
                  <span className="font-medium text-neutral-800">{ability.label}</span>
                  <br />
                  <span className="text-neutral-500">{ability.description}</span>
                </span>
              </label>
            ))}
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="mt-3 rounded-full bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {isPending ? "Saving…" : "Save abilities"}
          </button>
        </form>
      )}
    </div>
  );
}
