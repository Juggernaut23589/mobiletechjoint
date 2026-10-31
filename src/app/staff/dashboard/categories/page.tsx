import { redirect } from "next/navigation";
import { getStaffSession } from "@/app/actions/staff-auth";
import { hasAbility } from "@/lib/staff-auth";
import { getCategoriesWithCounts } from "@/lib/products";
import { NewCategoryForm } from "@/components/staff/NewCategoryForm";
import { CategoryRow } from "@/components/staff/CategoryRow";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const session = await getStaffSession();
  if (!session || !hasAbility(session, "manage_products")) {
    redirect("/staff/dashboard?error=forbidden");
  }

  const categories = await getCategoriesWithCounts();

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display mb-1 text-2xl font-bold tracking-tight text-ink">
          Categories
        </h1>
        <p className="text-sm text-ink/60">
          Create, rename, or delete product categories — no developer needed. Deleting a category
          doesn&apos;t delete its products; they just become uncategorized.
        </p>
      </div>

      <div className="mb-6 rounded-lg border border-neutral-200 bg-white p-4">
        <NewCategoryForm />
      </div>

      {categories.length === 0 ? (
        <p className="text-sm text-ink/60">No categories yet.</p>
      ) : (
        <div className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
          {categories.map((c) => (
            <CategoryRow key={c.id} category={c} />
          ))}
        </div>
      )}
    </div>
  );
}
