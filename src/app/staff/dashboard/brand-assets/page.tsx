import { redirect } from "next/navigation";
import Link from "next/link";
import { getStaffSession } from "@/app/actions/staff-auth";
import { hasAbility } from "@/lib/staff-auth";
import { getBrandsWithCounts } from "@/lib/products";
import { createServiceClient } from "@/lib/supabase/server";
import { BrandAssetManager } from "@/components/staff/BrandAssetManager";
import type { BrandBannerImage } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function BrandAssetsPage({
  searchParams,
}: {
  searchParams: Promise<{ brand?: string }>;
}) {
  const session = await getStaffSession();
  if (!session || !hasAbility(session, "manage_merchandising")) {
    redirect("/staff/dashboard?error=forbidden");
  }

  const brands = await getBrandsWithCounts();
  const sp = await searchParams;
  const activeBrand = brands.find((b) => b.slug === sp.brand) ?? brands[0] ?? null;

  const images = activeBrand
    ? ((
        await createServiceClient()
          .from("brand_banner_images")
          .select("*")
          .eq("brand_id", activeBrand.id)
          .order("position", { ascending: true })
      ).data as BrandBannerImage[] | null) ?? []
    : [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display mb-1 text-2xl font-bold tracking-tight text-ink">
          Customize Brand Assets
        </h1>
        <p className="text-sm text-ink/60">
          The picture strips shown at the top and bottom of each brand page. A brand with
          nothing uploaded here simply shows no strip on its page.
        </p>
      </div>

      {brands.length === 0 ? (
        <p className="text-sm text-ink/60">No brands yet.</p>
      ) : (
        <div className="flex flex-col gap-6 lg:flex-row">
          <nav className="flex shrink-0 flex-col gap-0.5 lg:w-[220px]">
            {brands.map((b) => (
              <Link
                key={b.id}
                href={`/staff/dashboard/brand-assets?brand=${b.slug}`}
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
            <div className="flex min-w-0 flex-1 flex-col gap-5">
              <BrandAssetManager
                brandId={activeBrand.id}
                brandSlug={activeBrand.slug}
                placement="top"
                images={images.filter((img) => img.placement === "top")}
              />
              <BrandAssetManager
                brandId={activeBrand.id}
                brandSlug={activeBrand.slug}
                placement="bottom"
                images={images.filter((img) => img.placement === "bottom")}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
