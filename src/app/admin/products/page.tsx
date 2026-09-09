import { createServiceClient } from "@/lib/supabase/server";
import { DraftProductRow } from "@/components/admin/DraftProductRow";
import { MerchandisingRow } from "@/components/admin/MerchandisingRow";
import { AdminNav } from "@/components/admin/AdminNav";
import type { ProductWithImages, Brand } from "@/types/database";

// Always fresh — this is a working queue (new Instagram drafts land here
// every 3 hours; whoever is completing them needs to see them immediately,
// not a cached view from up to a minute ago like the public storefront.
export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const supabase = createServiceClient();
  const { data: drafts } = await supabase
    .from("products")
    .select("*, product_images(*), category:categories(*), brand:brands(*)")
    .eq("status", "draft")
    .order("created_at", { ascending: false });

  const { data: published } = await supabase
    .from("products")
    .select("*, product_images(*), category:categories(*), brand:brands(*)")
    .eq("status", "published")
    .order("name");

  const { data: brands } = await supabase.from("brands").select("*").order("name");

  const draftItems = (drafts ?? []) as unknown as ProductWithImages[];
  const publishedItems = (published ?? []) as unknown as ProductWithImages[];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <AdminNav active="products" />

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Draft Products</h1>
        <p className="text-sm text-neutral-500">
          {draftItems.length} awaiting price/stock · {publishedItems.length} published
        </p>
      </div>

      {draftItems.length === 0 ? (
        <p className="text-sm text-neutral-500">
          No drafts waiting. New Instagram posts appear here once daily once
          the poller is connected.
        </p>
      ) : (
        <div className="flex flex-col">
          {draftItems.map((product) => (
            <DraftProductRow key={product.id} product={product} />
          ))}
        </div>
      )}

      <div className="mt-12">
        <h2 className="text-xl font-bold tracking-tight">Merchandising</h2>
        <p className="mb-4 text-sm text-neutral-500">
          Pick what shows in the homepage hero carousel and the &quot;Trending
          Now&quot; section. There&apos;s no order history yet to compute this
          automatically — these are manual picks until real sales data exists.
        </p>

        {publishedItems.length === 0 ? (
          <p className="text-sm text-neutral-500">No published products yet.</p>
        ) : (
          <div className="flex flex-col">
            {publishedItems.map((product) => (
              <MerchandisingRow key={product.id} product={product} brands={(brands ?? []) as Brand[]} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
