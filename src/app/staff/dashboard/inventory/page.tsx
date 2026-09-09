import { redirect } from "next/navigation";
import { getStaffSession } from "@/app/actions/staff-auth";
import { hasAbility } from "@/lib/staff-auth";
import { createServiceClient } from "@/lib/supabase/server";
import { StockEditorRow } from "@/components/staff/StockEditorRow";
import type { ProductWithImages } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function StaffInventoryPage() {
  const session = await getStaffSession();
  if (!session || (session.role !== "super_admin" && !hasAbility(session, "manage_inventory"))) {
    redirect("/staff/dashboard?error=forbidden");
  }

  const supabase = createServiceClient();
  const { data: products } = await supabase
    .from("products")
    .select("*, product_images(*), category:categories(*), brand:brands(*)")
    .eq("status", "published")
    .order("stock_quantity", { ascending: true });

  const items = (products ?? []) as unknown as ProductWithImages[];
  const outOfStock = items.filter((p) => p.stock_quantity <= 0).length;
  const lowStock = items.filter((p) => p.stock_quantity > 0 && p.stock_quantity <= 5).length;

  return (
    <div>
      <h1 className="font-display mb-1 text-2xl font-bold tracking-tight text-brand-900">Inventory</h1>
      <p className="mb-6 text-sm text-neutral-500">
        {items.length} published products · {outOfStock} out of stock · {lowStock} low stock
      </p>

      <div className="flex flex-col rounded-lg border border-neutral-200 bg-white px-4">
        {items.map((product) => (
          <StockEditorRow key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
