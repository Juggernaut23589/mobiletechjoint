import { redirect } from "next/navigation";
import { getStaffSession } from "@/app/actions/staff-auth";
import { hasAbility } from "@/lib/staff-auth";
import { createServiceClient } from "@/lib/supabase/server";
import { BannerManager } from "@/components/staff/BannerManager";
import type { HomepageBanner } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function BannersPage() {
  const session = await getStaffSession();
  if (!session || !hasAbility(session, "manage_merchandising")) {
    redirect("/staff/dashboard?error=forbidden");
  }

  const { data } = await createServiceClient()
    .from("homepage_banners")
    .select("*")
    .order("position", { ascending: true });

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display mb-1 text-2xl font-bold tracking-tight text-ink">
          Customize Banner
        </h1>
        <p className="text-sm text-ink/60">
          Full-width banners shown in the homepage hero carousel, in the same box as the intro
          and brand slides. Up to 10 at a time.
        </p>
      </div>

      <BannerManager banners={(data as HomepageBanner[] | null) ?? []} />
    </div>
  );
}
