import { createServiceClient } from "@/lib/supabase/server";
import { DraftProductRow } from "@/components/admin/DraftProductRow";
import { adminLogout } from "@/app/actions/admin-auth";
import type { ProductWithImages } from "@/types/database";

// Always fresh — this is a working queue (new Instagram drafts land here
// every 3 hours; whoever is completing them needs to see them immediately,
// not a cached view from up to a minute ago like the public storefront.
export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const supabase = createServiceClient();
  const { data: drafts } = await supabase
    .from("products")
    .select("*, product_images(*), category:categories(*)")
    .eq("status", "draft")
    .order("created_at", { ascending: false });

  const { count: publishedCount } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("status", "published");

  const items = (drafts ?? []) as unknown as ProductWithImages[];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Draft Products</h1>
          <p className="text-sm text-neutral-500">
            {items.length} awaiting price/stock · {publishedCount ?? 0} published
          </p>
        </div>
        <form action={adminLogout}>
          <button type="submit" className="text-sm text-neutral-400 hover:text-neutral-900">
            Log out
          </button>
        </form>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-neutral-500">
          No drafts waiting. New Instagram posts appear here every 3 hours once
          the poller is connected.
        </p>
      ) : (
        <div className="flex flex-col">
          {items.map((product) => (
            <DraftProductRow key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
