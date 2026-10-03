import Link from "next/link";
import { redirect } from "next/navigation";
import { getStaffSession } from "@/app/actions/staff-auth";
import { hasAbility } from "@/lib/staff-auth";
import { createServiceClient } from "@/lib/supabase/server";
import { pageRange, parsePage, sanitizeSearch } from "@/lib/staff-query";
import { StockEditorRow } from "@/components/staff/StockEditorRow";
import { SheetUpload } from "@/components/staff/SheetUpload";
import { applyStockImport, previewStockImport } from "@/app/actions/staff-inventory";
import { Pagination } from "@/components/staff/Pagination";
import type { ProductWithImages } from "@/types/database";

export const dynamic = "force-dynamic";

const LOW_STOCK_MAX = 5;
const STOCK_FILTERS = [
  { value: "", label: "All stock levels" },
  { value: "out", label: "Out of stock" },
  { value: "low", label: `Low (1–${LOW_STOCK_MAX})` },
  { value: "in", label: "In stock" },
];

export default async function StaffInventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; stock?: string; page?: string }>;
}) {
  const session = await getStaffSession();
  if (!session || (session.role !== "super_admin" && !hasAbility(session, "manage_inventory"))) {
    redirect("/staff/dashboard?error=forbidden");
  }

  const params = await searchParams;
  const q = sanitizeSearch(params.q);
  const stock = STOCK_FILTERS.some((f) => f.value === params.stock) ? params.stock : "";
  const page = parsePage(params.page);
  const supabase = createServiceClient();

  let query = supabase
    .from("products")
    .select("*, product_images(*), category:categories(*), brand:brands(*)", { count: "exact" })
    .eq("status", "published")
    .order("stock_quantity", { ascending: true })
    .order("name")
    .range(...pageRange(page));
  if (q) query = query.ilike("name", `%${q}%`);
  if (stock === "out") query = query.lte("stock_quantity", 0);
  if (stock === "low") query = query.gt("stock_quantity", 0).lte("stock_quantity", LOW_STOCK_MAX);
  if (stock === "in") query = query.gt("stock_quantity", 0);

  const published = () =>
    supabase.from("products").select("*", { count: "exact", head: true }).eq("status", "published");
  const [{ data: products, count }, { count: totalCount }, { count: outCount }, { count: lowCount }] =
    await Promise.all([
      query,
      published(),
      published().lte("stock_quantity", 0),
      published().gt("stock_quantity", 0).lte("stock_quantity", LOW_STOCK_MAX),
    ]);

  const items = (products ?? []) as unknown as ProductWithImages[];

  return (
    <div>
      <h1 className="font-display mb-1 text-2xl font-bold tracking-tight text-brand-900">Inventory</h1>
      <p className="mb-6 text-sm text-neutral-500">
        {totalCount ?? 0} published products ·{" "}
        <Link href="/staff/dashboard/inventory?stock=out" className="text-red-600 hover:underline">
          {outCount ?? 0} out of stock
        </Link>{" "}
        ·{" "}
        <Link href="/staff/dashboard/inventory?stock=low" className="text-amber-600 hover:underline">
          {lowCount ?? 0} low stock
        </Link>
      </p>

      <div className="mb-6">
        <SheetUpload
          title="Stock count"
          description={
            <>
              Download the stock sheet, fill in <code>new_stock</code> with what you physically count, and
              upload it here. Rows you leave blank aren&apos;t changed, so you can count one shelf at a time.
            </>
          }
          downloadHref="/staff/dashboard/inventory/stock-sheet"
          downloadLabel="Download stock sheet"
          valueFormat="count"
          previewAction={previewStockImport}
          applyAction={applyStockImport}
        />
      </div>

      <form className="mb-4 flex flex-wrap gap-2">
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Search products…"
          className="min-w-0 flex-1 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
        />
        <select name="stock" defaultValue={stock} className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm">
          {STOCK_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-full bg-brand-900 px-4 py-2 text-sm font-semibold text-white">
          Filter
        </button>
      </form>

      {items.length === 0 ? (
        <p className="text-sm text-neutral-500">No products match these filters.</p>
      ) : (
        <div className="flex flex-col rounded-lg border border-neutral-200 bg-white px-4">
          {items.map((product) => (
            <StockEditorRow key={`${product.id}-${product.stock_quantity}`} product={product} />
          ))}
        </div>
      )}
      <Pagination
        basePath="/staff/dashboard/inventory"
        params={{ q, stock }}
        page={page}
        total={count ?? 0}
      />
    </div>
  );
}
