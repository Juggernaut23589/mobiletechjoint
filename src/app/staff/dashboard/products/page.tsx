import Link from "next/link";
import { redirect } from "next/navigation";
import Image from "next/image";
import { getStaffSession } from "@/app/actions/staff-auth";
import { hasAbility } from "@/lib/staff-auth";
import { createServiceClient } from "@/lib/supabase/server";
import { formatNaira } from "@/lib/money";
import type { ProductWithImages } from "@/types/database";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  published: "bg-green-100 text-green-700",
  draft: "bg-amber-100 text-amber-700",
  archived: "bg-neutral-200 text-neutral-600",
};

export default async function StaffProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await getStaffSession();
  if (!session || (session.role !== "super_admin" && !hasAbility(session, "manage_products"))) {
    redirect("/staff/dashboard?error=forbidden");
  }

  const { q } = await searchParams;

  const supabase = createServiceClient();
  let query = supabase
    .from("products")
    .select("*, product_images(*), category:categories(*), brand:brands(*)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (q) query = query.ilike("name", `%${q}%`);

  const { data: products } = await query;
  const items = (products ?? []) as unknown as ProductWithImages[];

  return (
    <div>
      <h1 className="font-display mb-1 text-2xl font-bold tracking-tight text-brand-900">Products</h1>
      <p className="mb-6 text-sm text-neutral-500">
        {items.length} shown{q ? ` for "${q}"` : ""} — most recent first.
      </p>

      <form className="mb-4">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by name…"
          className="w-full max-w-sm rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
      </form>

      <div className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
        {items.map((product) => {
          const cover = product.product_images.find((img) => !img.is_video) ?? null;
          return (
            <Link
              key={product.id}
              href={`/staff/dashboard/products/${product.id}/edit`}
              className="flex items-center gap-3 p-3 hover:bg-neutral-50"
            >
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-neutral-100">
                {cover ? (
                  <Image src={cover.url} alt={product.name} fill sizes="48px" className="object-cover" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{product.name}</p>
                <p className="text-xs text-neutral-500">
                  {product.price_kobo ? formatNaira(product.price_kobo) : "No price set"}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[product.status]}`}
              >
                {product.status}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
