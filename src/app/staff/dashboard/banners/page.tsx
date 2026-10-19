import { redirect } from "next/navigation";
import { getStaffSession } from "@/app/actions/staff-auth";
import { hasAbility } from "@/lib/staff-auth";
import { createServiceClient } from "@/lib/supabase/server";
import { getBrandsWithCounts } from "@/lib/products";
import { BannerManager } from "@/components/staff/BannerManager";
import { HeroBrandToggleButton } from "@/components/staff/HeroBrandToggleButton";
import type { HomepageBanner } from "@/types/database";

export const dynamic = "force-dynamic";

const HERO_BRAND_LIMIT = 10;

export default async function BannersPage() {
  const session = await getStaffSession();
  if (!session || !hasAbility(session, "manage_merchandising")) {
    redirect("/staff/dashboard?error=forbidden");
  }

  const [{ data: bannerData }, allBrands, { data: curatedRows }] = await Promise.all([
    createServiceClient()
      .from("homepage_banners")
      .select("*")
      .order("position", { ascending: true }),
    getBrandsWithCounts(),
    createServiceClient()
      .from("homepage_hero_brands")
      .select("brand_id")
      .order("position", { ascending: true }),
  ]);

  const curatedIds = (curatedRows ?? []).map((r) => r.brand_id as string);
  const curatedSet = new Set(curatedIds);
  const byId = new Map(allBrands.map((b) => [b.id, b]));
  const curatedBrands = curatedIds.map((id) => byId.get(id)).filter((b) => b != null);
  const atLimit = curatedBrands.length >= HERO_BRAND_LIMIT;

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display mb-1 text-2xl font-bold tracking-tight text-ink">
          Customize Banner
        </h1>
        <p className="text-sm text-ink/60">
          Everything shown in the homepage hero carousel, after the fixed intro slide: uploaded
          banners and brand showcase slides, both in the order they were added.
        </p>
      </div>

      <div className="mb-10">
        <h2 className="font-display mb-3 text-lg font-bold text-ink">Uploaded banners</h2>
        <BannerManager banners={(bannerData as HomepageBanner[] | null) ?? []} />
      </div>

      <div>
        <h2 className="font-display mb-1 text-lg font-bold text-ink">Brand showcase slides</h2>
        <p className="mb-3 text-sm text-ink/60">
          Product-collage slides for a specific brand, up to {HERO_BRAND_LIMIT}. A brand only
          shows if it currently has published, photographed stock.
        </p>

        <div className="mb-4">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-neutral-500">
            On the homepage ({curatedBrands.length}/{HERO_BRAND_LIMIT})
          </h3>
          {curatedBrands.length === 0 ? (
            <p className="text-sm text-ink/60">No brand showcase slides — the carousel skips straight to uploaded banners.</p>
          ) : (
            <div className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
              {curatedBrands.map((b) => (
                <div key={b.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-900">{b.name}</p>
                    <p className="truncate text-xs text-neutral-500">
                      {b.product_count} published product{b.product_count === 1 ? "" : "s"}
                    </p>
                  </div>
                  <HeroBrandToggleButton brandId={b.id} active />
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-neutral-500">
            All brands
          </h3>
          {allBrands.length === 0 ? (
            <p className="text-sm text-ink/60">No brands with published stock yet.</p>
          ) : (
            <div className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
              {allBrands.map((b) => {
                const active = curatedSet.has(b.id);
                return (
                  <div key={b.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-neutral-900">{b.name}</p>
                      <p className="truncate text-xs text-neutral-500">
                        {b.product_count} published product{b.product_count === 1 ? "" : "s"}
                      </p>
                    </div>
                    <HeroBrandToggleButton brandId={b.id} active={active} disabled={!active && atLimit} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
