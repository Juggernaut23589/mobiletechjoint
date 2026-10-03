import Link from "next/link";
import { redirect } from "next/navigation";
import Image from "next/image";
import { Plus } from "lucide-react";
import { getStaffSession } from "@/app/actions/staff-auth";
import { hasAbility } from "@/lib/staff-auth";
import { createServiceClient } from "@/lib/supabase/server";
import { formatNaira } from "@/lib/money";
import { pageRange, parsePage, sanitizeSearch } from "@/lib/staff-query";
import { Pagination } from "@/components/staff/Pagination";
import type { ProductWithImages } from "@/types/database";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  published: "bg-green-100 text-green-700",
  draft: "bg-amber-100 text-amber-700",
  archived: "bg-neutral-200 text-neutral-600",
};

const STATUSES = ["published", "draft", "archived"];
const ISSUES = [
  { value: "no_brand", label: "Missing brand" },
  { value: "no_price", label: "Missing price" },
  { value: "no_cost", label: "Missing cost price" },
];

export default async function StaffProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    brand?: string;
    category?: string;
    issue?: string;
    page?: string;
  }>;
}) {
  const session = await getStaffSession();
  if (!session || (session.role !== "super_admin" && !hasAbility(session, "manage_products"))) {
    redirect("/staff/dashboard?error=forbidden");
  }

  const params = await searchParams;
  const q = sanitizeSearch(params.q);
  const page = parsePage(params.page);
  const supabase = createServiceClient();

  const [{ data: brands }, { data: categories }] = await Promise.all([
    supabase.from("brands").select("id, name").order("name"),
    supabase.from("categories").select("id, name").order("name"),
  ]);
  const status = STATUSES.includes(params.status ?? "") ? params.status : undefined;
  const brand = brands?.some((b) => b.id === params.brand) ? params.brand : undefined;
  const category = categories?.some((c) => c.id === params.category) ? params.category : undefined;
  const issue = ISSUES.some((i) => i.value === params.issue) ? params.issue : undefined;

  let query = supabase
    .from("products")
    .select("*, product_images(*), category:categories(*), brand:brands(*)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(...pageRange(page));
  if (q) query = query.or(`name.ilike.%${q}%,slug.ilike.%${q}%`);
  if (status) query = query.eq("status", status);
  if (brand) query = query.eq("brand_id", brand);
  if (category) query = query.eq("category_id", category);
  if (issue === "no_brand") query = query.is("brand_id", null);
  if (issue === "no_price") query = query.is("price_kobo", null);
  if (issue === "no_cost") query = query.is("cost_kobo", null);

  const { data: products, count } = await query;
  const items = (products ?? []) as unknown as ProductWithImages[];
  const hasFilters = Boolean(q || status || brand || category || issue);
  const selectClass = "rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm";

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display mb-1 text-2xl font-bold tracking-tight text-brand-900">Products</h1>
          <p className="text-sm text-neutral-500">
            {(count ?? 0).toLocaleString()} {hasFilters ? "matching" : "total"} — most recent first.
          </p>
        </div>
        <Link
          href="/staff/dashboard/products/new"
          className="inline-flex items-center gap-1.5 rounded-full bg-brand-gradient px-4 py-2 text-sm font-semibold text-white shadow-glow"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Add product
        </Link>
      </div>

      <form className="mb-4 flex flex-wrap gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by name or slug…"
          className="min-w-0 flex-1 basis-56 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
        />
        <select name="status" defaultValue={status ?? ""} className={`${selectClass} capitalize`}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select name="category" defaultValue={category ?? ""} className={selectClass}>
          <option value="">All categories</option>
          {(categories ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select name="brand" defaultValue={brand ?? ""} className={selectClass}>
          <option value="">All brands</option>
          {(brands ?? []).map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <select name="issue" defaultValue={issue ?? ""} className={selectClass}>
          <option value="">Any data quality</option>
          {ISSUES.map((i) => (
            <option key={i.value} value={i.value}>
              {i.label}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-full bg-brand-900 px-4 py-2 text-sm font-semibold text-white">
          Filter
        </button>
        {hasFilters && (
          <Link href="/staff/dashboard/products" className="self-center text-xs text-neutral-500 hover:underline">
            Clear
          </Link>
        )}
      </form>

      <div className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
        {items.length === 0 && (
          <p className="p-6 text-sm text-neutral-500">
            {hasFilters ? "No products match these filters." : "No products yet — add the first one."}
          </p>
        )}
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
                  {" · "}
                  {product.brand?.name ?? "No brand"} · Stock {product.stock_quantity}
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
      <Pagination
        basePath="/staff/dashboard/products"
        params={{ q, status, brand, category, issue }}
        page={page}
        total={count ?? 0}
      />
    </div>
  );
}
