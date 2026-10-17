import { redirect } from "next/navigation";
import Link from "next/link";
import { getStaffSession } from "@/app/actions/staff-auth";
import { hasAbility } from "@/lib/staff-auth";
import { getBrandsWithCounts } from "@/lib/products";
import { createServiceClient } from "@/lib/supabase/server";
import { AdManager } from "@/components/staff/AdManager";
import type { AdPlacement } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function AdPlacementsPage({
  searchParams,
}: {
  searchParams: Promise<{ brand?: string }>;
}) {
  const session = await getStaffSession();
  if (!session || !hasAbility(session, "manage_merchandising")) {
    redirect("/staff/dashboard?error=forbidden");
  }

  const [brands, sp] = await Promise.all([getBrandsWithCounts(), searchParams]);
  const activeBrand = brands.find((b) => b.slug === sp.brand) ?? brands[0] ?? null;

  const supabase = createServiceClient();
  const [{ data: homepageAds }, { data: brandAds }] = await Promise.all([
    supabase.from("ad_placements").select("*").eq("placement", "homepage").order("position", { ascending: true }),
    activeBrand
      ? supabase
          .from("ad_placements")
          .select("*")
          .eq("placement", "brand")
          .eq("brand_id", activeBrand.id)
          .order("position", { ascending: true })
      : Promise.resolve({ data: [] as AdPlacement[] | null }),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display mb-1 text-2xl font-bold tracking-tight text-ink">
          Edit Ad Placements
        </h1>
        <p className="text-sm text-ink/60">
          Picture ads with an optional caption and click-through link. Homepage ads show near the
          footer; brand ads show beside the video on every product page for that brand.
        </p>
      </div>

      <div className="mb-8">
        <AdManager placement="homepage" ads={(homepageAds as AdPlacement[] | null) ?? []} />
      </div>

      <div>
        <h2 className="font-display mb-3 text-lg font-bold text-ink">Brand ads</h2>
        {brands.length === 0 ? (
          <p className="text-sm text-ink/60">No brands yet.</p>
        ) : (
          <div className="flex flex-col gap-6 lg:flex-row">
            <nav className="flex shrink-0 flex-col gap-0.5 lg:w-[220px]">
              {brands.map((b) => (
                <Link
                  key={b.id}
                  href={`/staff/dashboard/ad-placements?brand=${b.slug}`}
                  className={`truncate rounded-lg px-3 py-2 text-sm font-medium ${
                    activeBrand?.id === b.id
                      ? "bg-brand-50 text-brand-700"
                      : "text-neutral-700 hover:bg-neutral-50"
                  }`}
                >
                  {b.name}
                </Link>
              ))}
            </nav>

            {activeBrand && (
              <div className="min-w-0 flex-1">
                <AdManager
                  placement="brand"
                  brandId={activeBrand.id}
                  brandSlug={activeBrand.slug}
                  ads={(brandAds as AdPlacement[] | null) ?? []}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
