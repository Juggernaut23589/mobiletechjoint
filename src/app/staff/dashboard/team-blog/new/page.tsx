import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getStaffSession } from "@/app/actions/staff-auth";
import { hasAbility } from "@/lib/staff-auth";
import { TeamMemberForm } from "@/components/staff/TeamMemberForm";

export const dynamic = "force-dynamic";

export default async function NewTeamMemberPage() {
  const session = await getStaffSession();
  if (!session || !hasAbility(session, "manage_content")) redirect("/staff/dashboard?error=forbidden");

  return (
    <div>
      <Link
        href="/staff/dashboard/team-blog"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-500 hover:text-neutral-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Team blog
      </Link>
      <h1 className="font-display mb-6 text-2xl font-bold tracking-tight text-brand-900">
        Add a team member
      </h1>
      <div className="max-w-2xl rounded-lg border border-neutral-200 bg-white p-5">
        <TeamMemberForm />
      </div>
    </div>
  );
}
