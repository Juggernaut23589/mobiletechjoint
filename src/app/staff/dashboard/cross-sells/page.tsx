import { redirect } from "next/navigation";
import { getStaffSession } from "@/app/actions/staff-auth";
import { hasAbility } from "@/lib/staff-auth";
import { createServiceClient } from "@/lib/supabase/server";
import { CategoryComplementForm } from "@/components/admin/CategoryComplementForm";
import { removeCategoryComplement } from "@/app/actions/admin-crosssells";
import type { Category } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function StaffCrossSellsPage() {
  const session = await getStaffSession();
  if (!session || (session.role !== "super_admin" && !hasAbility(session, "manage_cross_sells"))) {
    redirect("/staff/dashboard?error=forbidden");
  }

  const supabase = createServiceClient();
  const [{ data: categories }, { data: complements }] = await Promise.all([
    supabase.from("categories").select("*").order("name"),
    supabase
      .from("category_complements")
      .select(
        "id, category:categories!category_complements_category_id_fkey(*), complement:categories!category_complements_complement_category_id_fkey(*)"
      )
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div>
      <h1 className="font-display mb-1 text-2xl font-bold tracking-tight text-brand-900">
        Cross-sell Pairings
      </h1>
      <p className="mb-6 text-sm text-neutral-500">
        When a shopper views a product in the first category, they&apos;ll see cross-sells
        pulled from the second category. E.g. Cameras → Lenses &amp; Filters, Memory Cards
        &amp; Storage.
      </p>

      <CategoryComplementForm categories={(categories ?? []) as Category[]} />

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">
          Existing pairings
        </h2>
        {!complements || complements.length === 0 ? (
          <p className="text-sm text-neutral-500">No pairings set up yet.</p>
        ) : (
          <div className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
            {(complements as unknown as { id: string; category: Category; complement: Category }[]).map(
              (row) => (
                <form key={row.id} action={removeCategoryComplement} className="flex items-center justify-between p-3">
                  <input type="hidden" name="id" value={row.id} />
                  <p className="text-sm">
                    <span className="font-medium">{row.category.name}</span>
                    <span className="mx-2 text-neutral-400">complements with</span>
                    <span className="font-medium">{row.complement.name}</span>
                  </p>
                  <button type="submit" className="text-sm text-neutral-400 hover:text-red-600">
                    Remove
                  </button>
                </form>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
