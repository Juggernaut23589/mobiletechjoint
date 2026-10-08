import { redirect } from "next/navigation";
import Link from "next/link";
import { getStaffSession } from "@/app/actions/staff-auth";
import { hasAbility } from "@/lib/staff-auth";
import { createServiceClient } from "@/lib/supabase/server";
import { TeamMemberDeleteButton } from "@/components/staff/TeamMemberDeleteButton";

export const dynamic = "force-dynamic";

export default async function TeamBlogPage() {
  const session = await getStaffSession();
  if (!session || !hasAbility(session, "manage_content")) redirect("/staff/dashboard?error=forbidden");

  const { data: members } = await createServiceClient()
    .from("team_members")
    .select("id, name, role, is_published, position")
    .order("position", { ascending: true });

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-display mb-1 text-2xl font-bold tracking-tight text-brand-900">Team blog</h1>
          <p className="text-sm text-neutral-500">
            The &quot;Meet the team&quot; profiles shown on the homepage and /team. Only published
            profiles appear on the live site.
          </p>
        </div>
        <Link
          href="/staff/dashboard/team-blog/new"
          className="shrink-0 rounded-full bg-brand-gradient px-4 py-2 text-sm font-semibold text-white shadow-glow"
        >
          Add team member
        </Link>
      </div>

      {!members || members.length === 0 ? (
        <p className="text-sm text-neutral-500">No team members yet.</p>
      ) : (
        <div className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-neutral-900">{m.name}</p>
                <p className="truncate text-xs text-neutral-500">{m.role}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    m.is_published ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-500"
                  }`}
                >
                  {m.is_published ? "Published" : "Draft"}
                </span>
                <Link
                  href={`/staff/dashboard/team-blog/${m.id}`}
                  className="text-sm font-semibold text-brand-700 hover:text-brand-900"
                >
                  Edit
                </Link>
                <TeamMemberDeleteButton id={m.id} name={m.name} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
