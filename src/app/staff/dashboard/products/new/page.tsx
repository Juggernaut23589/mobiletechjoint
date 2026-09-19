import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getStaffSession } from "@/app/actions/staff-auth";
import { hasAbility } from "@/lib/staff-auth";
import { createServiceClient } from "@/lib/supabase/server";
import { ProductCreateForm } from "@/components/staff/ProductCreateForm";
import type { Category, Brand } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function StaffProductNewPage() {
  const session = await getStaffSession();
  if (!session || (session.role !== "super_admin" && !hasAbility(session, "manage_products"))) {
    redirect("/staff/dashboard?error=forbidden");
  }

  const supabase = createServiceClient();
  const [{ data: categories }, { data: brands }] = await Promise.all([
    supabase.from("categories").select("*").order("name"),
    supabase.from("brands").select("*").order("name"),
  ]);

  return (
    <div>
      <Link
        href="/staff/dashboard/products"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All products
      </Link>
      <h1 className="font-display mb-1 text-2xl font-bold tracking-tight text-brand-900">
        Add a product
      </h1>
      <p className="mb-6 text-sm text-neutral-500">
        Fill in what you know now — everything can be changed later from the edit page.
      </p>

      <ProductCreateForm
        categories={(categories ?? []) as Category[]}
        brands={(brands ?? []) as Brand[]}
      />
    </div>
  );
}
