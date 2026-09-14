import { getCurrentUser } from "@/app/actions/account";
import { getCustomerProfile } from "@/lib/account";
import { signOut } from "@/app/actions/account";
import { AccountNav } from "@/components/account/AccountNav";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  // /account/login and /account/signup are nested under this same layout
  // but have no session yet — show them full-width with no account
  // sidebar rather than a broken-looking placeholder avatar/nav.
  if (!user) {
    return <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-8">{children}</div>;
  }

  const profile = await getCustomerProfile(user.id);

  const name = profile?.full_name?.trim() || user.email || "Account";
  const initials =
    profile?.full_name
      ?.trim()
      .split(/\s+/)
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || name[0]?.toUpperCase() || "?";
  const memberSinceYear = profile ? new Date(profile.created_at).getFullYear() : null;

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-8">
      <div className="flex flex-col gap-8 md:flex-row">
        <div className="md:w-[220px] md:shrink-0">
          <div className="mb-5.5 flex items-center gap-3 px-1">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-neutral-900">{name}</p>
              {memberSinceYear && (
                <p className="text-xs text-neutral-500">Member since {memberSinceYear}</p>
              )}
            </div>
          </div>

          <AccountNav />

          <form action={signOut} className="mt-3.5">
            <button
              type="submit"
              className="w-full rounded-[10px] px-3.5 py-2.5 text-left text-[13.5px] font-semibold text-red-500 hover:bg-red-50"
            >
              Log Out
            </button>
          </form>
        </div>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
