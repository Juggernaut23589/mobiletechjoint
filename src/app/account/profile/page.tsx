import { getCurrentUser } from "@/app/actions/account";
import { getCustomerProfile } from "@/lib/account";
import { ProfileForm } from "@/components/account/ProfileForm";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const profile = await getCustomerProfile(user.id);

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl text-white">Edit Profile</h1>
      <p className="mb-6 text-sm text-white/50">{user.email}</p>

      <div className="max-w-lg rounded-lg border border-neutral-200 bg-white p-6">
        <ProfileForm
          defaultFullName={profile?.full_name ?? ""}
          defaultPhone={profile?.phone ?? ""}
          defaultAge={profile?.age ?? null}
          defaultGender={profile?.gender ?? ""}
          defaultAddress={profile?.address ?? ""}
        />
      </div>
    </div>
  );
}
