import { redirect } from "next/navigation";
import { getStaffSession } from "@/app/actions/staff-auth";
import { createServiceClient } from "@/lib/supabase/server";
import { StaffMemberRow } from "@/components/staff/StaffMemberRow";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const session = await getStaffSession();
  if (!session || session.role !== "super_admin") redirect("/staff/dashboard?error=forbidden");

  const supabase = createServiceClient();
  const { data: members } = await supabase
    .from("staff_profiles")
    .select("id, full_name, email, phone, job_title, role, is_active, is_pending, abilities, created_at")
    .order("created_at", { ascending: true });

  const pending = (members ?? []).filter((m) => m.is_pending);
  const active = (members ?? []).filter((m) => !m.is_pending);

  return (
    <div>
      <h1 className="font-display mb-1 text-2xl font-bold tracking-tight text-brand-900">Team</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Approve new staff accounts and grant exactly the abilities each person needs.
      </p>

      {pending.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-amber-600">
            Awaiting approval ({pending.length})
          </h2>
          <div className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-amber-200 bg-amber-50">
            {pending.map((member) => (
              <StaffMemberRow key={member.id} member={member} currentUserId={session.userId} />
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">
          Team members ({active.length})
        </h2>
        {active.length === 0 ? (
          <p className="text-sm text-neutral-500">No approved staff yet.</p>
        ) : (
          <div className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
            {active.map((member) => (
              <StaffMemberRow key={member.id} member={member} currentUserId={session.userId} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
