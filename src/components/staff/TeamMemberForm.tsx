"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createTeamMember, updateTeamMember } from "@/app/actions/staff-team-blog";

export interface TeamMemberRecord {
  id: string;
  name: string;
  role: string;
  tagline: string;
  quote: string;
  bio: string;
  curates: { label: string; href: string }[];
  position: number;
  is_published: boolean;
}

const input = "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm";
const label = "text-xs font-medium text-neutral-500";

function curatesToText(curates: { label: string; href: string }[]): string {
  return curates.map((c) => `${c.label} | ${c.href}`).join("\n");
}

export function TeamMemberForm({ member }: { member?: TeamMemberRecord }) {
  const router = useRouter();
  const action = member ? updateTeamMember : createTeamMember;
  const [state, formAction, pending] = useActionState(action, {});

  useEffect(() => {
    if (!member && state.id) router.push(`/staff/dashboard/team-blog/${state.id}`);
  }, [state.id, member, router]);

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      {member && <input type="hidden" name="id" value={member.id} />}

      <label className={`${label} sm:col-span-2`}>
        Name
        <input name="name" required defaultValue={member?.name} className={input} />
      </label>

      <label className={label}>
        Role
        <input name="role" required defaultValue={member?.role} className={input} placeholder="e.g. Creative Director" />
      </label>

      <label className={label}>
        Order on page
        <input
          name="position"
          type="number"
          defaultValue={member?.position ?? 0}
          className={input}
        />
      </label>

      <label className={`${label} sm:col-span-2`}>
        Tagline (one line, shown under the name on cards)
        <input name="tagline" defaultValue={member?.tagline} className={input} />
      </label>

      <label className={`${label} sm:col-span-2`}>
        Pull-quote (shown on their profile page)
        <input name="quote" defaultValue={member?.quote} className={input} />
      </label>

      <label className={`${label} sm:col-span-2`}>
        Write-up (separate paragraphs with a blank line)
        <textarea name="bio" rows={8} defaultValue={member?.bio} className={input} />
      </label>

      <label className={`${label} sm:col-span-2`}>
        &quot;Shop what they pick&quot; links — one per line, as{" "}
        <code className="text-[11px]">Label | /href</code>
        <textarea
          name="curates"
          rows={3}
          defaultValue={member ? curatesToText(member.curates) : ""}
          className={input}
          placeholder={"Lighting | /category/lighting\nGodox | /brand/godox"}
        />
      </label>

      <label className="flex items-center gap-2 text-sm text-neutral-700 sm:col-span-2">
        <input
          type="checkbox"
          name="isPublished"
          value="true"
          defaultChecked={member?.is_published ?? true}
          className="h-4 w-4"
        />
        Published — visible on the homepage and /team
      </label>

      <div className="flex items-center gap-3 sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-brand-gradient px-4 py-2 text-sm font-semibold text-white shadow-glow disabled:opacity-50"
        >
          {pending ? "Saving…" : member ? "Save changes" : "Add team member"}
        </button>
        {state.error && <span className="text-sm text-red-600">{state.error}</span>}
        {state.notice && <span className="text-sm text-green-700">{state.notice}</span>}
      </div>
    </form>
  );
}
