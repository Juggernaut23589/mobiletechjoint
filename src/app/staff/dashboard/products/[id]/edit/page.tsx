import { notFound, redirect } from "next/navigation";
import { getStaffSession } from "@/app/actions/staff-auth";
import { hasAbility } from "@/lib/staff-auth";
import { createServiceClient } from "@/lib/supabase/server";
import { ProductEditForm } from "@/components/staff/ProductEditForm";
import { ProductImageManager } from "@/components/staff/ProductImageManager";
import type { ProductWithImages, Category, Brand } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function StaffProductEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; notice?: string }>;
}) {
  const session = await getStaffSession();
  if (!session || (session.role !== "super_admin" && !hasAbility(session, "manage_products"))) {
    redirect("/staff/dashboard?error=forbidden");
  }

  const { id } = await params;
  const { created, notice } = await searchParams;
  const supabase = createServiceClient();

  const [{ data: product }, { data: categories }, { data: brands }] = await Promise.all([
    supabase
      .from("products")
      .select("*, product_images(*), category:categories(*), brand:brands(*)")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("categories").select("*").order("name"),
    supabase.from("brands").select("*").order("name"),
  ]);

  if (!product) notFound();

  return (
    <div>
      <h1 className="font-display mb-1 text-2xl font-bold tracking-tight text-brand-900">
        Edit product
      </h1>
      <p className="mb-6 text-sm text-neutral-500">{product.name}</p>

      {created && (
        <p className="mb-5 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          Product created{product.status === "published" ? " and published" : " as a draft"}. Add
          more media or fine-tune the details below.
        </p>
      )}
      {notice && (
        <p className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {notice}
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <ProductEditForm
          product={product as unknown as ProductWithImages}
          categories={(categories ?? []) as Category[]}
          brands={(brands ?? []) as Brand[]}
        />
        <ProductImageManager
          productId={product.id}
          images={(product.product_images ?? []) as ProductWithImages["product_images"]}
        />
      </div>
    </div>
  );
}
