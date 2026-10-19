import { redirect } from "next/navigation";
import { getStaffSession } from "@/app/actions/staff-auth";
import { hasAbility } from "@/lib/staff-auth";
import { getBrandsWithCounts } from "@/lib/products";
import { createServiceClient } from "@/lib/supabase/server";
import { BrandShelfToggleButton } from "@/components/staff/BrandShelfToggleButton";

export const dynamic = "force-dynamic";

const SHELF_LIMIT = 6;

export default async function BrandShelvesPage() {
  const session = await getStaffSession();
  if (!session || !hasAbility(session, "manage_merchandising")) {
    redirect("/staff/dashboard?error=forbidden");
  }

  const [allBrands, { data: curatedRows }] = await Promise.all([
    getBrandsWithCounts(),
    createServiceClient()
      .from("homepage_brand_shelves")
      .select("brand_id")
      .order("position", { ascending: true }),
  ]);

  const curatedIds = (curatedRows ?? []).map((r) => r.brand_id);
  const curatedSet = new Set(curatedIds);
  const byId = new Map(allBrands.map((b) => [b.id, b]));
  const curatedBrands = curatedIds.map((id) => byId.get(id)).filter((b) => b != null);
  const atLimit = curatedBrands.length >= SHELF_LIMIT;

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display mb-1 text-2xl font-bold tracking-tight text-ink">
          Edit Shop by Brand
        </h1>
        <p className="text-sm text-ink/60">
          Hand-pick which brands get a shelf on the homepage&apos;s &quot;Shop by brand&quot;
          section, up to {SHELF_LIMIT}. With nothing picked, it falls back to the top brands by
          published stock automatically.
        </p>
      </div>

      <div className="mb-8">
        <h2 className="font-display mb-3 text-lg font-bold text-ink">
          Currently on the homepage ({curatedBrands.length}/{SHELF_LIMIT})
        </h2>
        {curatedBrands.length === 0 ? (
          <p className="text-sm text-ink/60">
            Nothing picked yet — the homepage is showing the top brands by stock instead.
          </p>
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
                <BrandShelfToggleButton brandId={b.id} active />
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="font-display mb-3 text-lg font-bold text-ink">All brands</h2>
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
                  <BrandShelfToggleButton
                    brandId={b.id}
                    active={active}
                    disabled={!active && atLimit}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
