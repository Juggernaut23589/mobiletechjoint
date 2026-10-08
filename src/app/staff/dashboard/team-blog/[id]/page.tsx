import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getStaffSession } from "@/app/actions/staff-auth";
import { hasAbility } from "@/lib/staff-auth";
import { createServiceClient } from "@/lib/supabase/server";
import { TeamMemberForm } from "@/components/staff/TeamMemberForm";
import { TeamMemberPhotoUpload } from "@/components/staff/TeamMemberPhotoUpload";

export const dynamic = "force-dynamic";

export default async function EditTeamMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getStaffSession();
  if (!session || !hasAbility(session, "manage_content")) redirect("/staff/dashboard?error=forbidden");

  const { id } = await params;
  const { data: member } = await createServiceClient()
    .from("team_members")
    .select("id, name, role, tagline, quote, bio, curates, position, is_published, photo_url")
    .eq("id", id)
    .maybeSingle();
  if (!member) notFound();

  return (
    <div>
      <Link
        href="/staff/dashboard/team-blog"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-500 hover:text-neutral-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Team blog
      </Link>
      <h1 className="font-display mb-6 text-2xl font-bold tracking-tight text-brand-900">{member.name}</h1>

      <div className="grid max-w-3xl gap-5 sm:grid-cols-[200px_1fr]">
        <TeamMemberPhotoUpload id={member.id} photoUrl={member.photo_url} />
        <div className="rounded-lg border border-neutral-200 bg-white p-5">
          <TeamMemberForm member={member} />
        </div>
      </div>
    </div>
  );
}
