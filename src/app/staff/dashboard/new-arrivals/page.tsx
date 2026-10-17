import { redirect } from "next/navigation";
import Image from "next/image";
import { getStaffSession } from "@/app/actions/staff-auth";
import { hasAbility } from "@/lib/staff-auth";
import { createServiceClient } from "@/lib/supabase/server";
import { sanitizeSearch } from "@/lib/staff-query";
import { NewArrivalToggleButton } from "@/components/staff/NewArrivalToggleButton";
import { formatNaira } from "@/lib/money";

export const dynamic = "force-dynamic";

const SEARCH_LIMIT = 60;

interface Row {
  id: string;
  name: string;
  price_kobo: number | null;
  is_new_arrival: boolean;
  brand: { name: string } | null;
  product_images: { url: string; is_video: boolean; position: number }[];
}

function coverUrl(row: Row): string | null {
  return row.product_images.filter((i) => !i.is_video).sort((a, b) => a.position - b.position)[0]?.url ?? null;
}

export default async function NewArrivalsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; brand?: string }>;
}) {
  const session = await getStaffSession();
  if (!session || !hasAbility(session, "manage_products")) {
    redirect("/staff/dashboard?error=forbidden");
  }

  const params = await searchParams;
  const q = sanitizeSearch(params.q);
  const supabase = createServiceClient();

  const [{ data: categories }, { data: brands }, { data: current }] = await Promise.all([
    supabase.from("categories").select("id, name").order("name"),
    supabase.from("brands").select("id, name").order("name"),
    supabase
      .from("products")
      .select("id, name, price_kobo, is_new_arrival, brand:brands(name), product_images(url, is_video, position)")
      .eq("is_new_arrival", true)
      .order("created_at", { ascending: false }),
  ]);

  const category = categories?.some((c) => c.id === params.category) ? params.category : undefined;
  const brand = brands?.some((b) => b.id === params.brand) ? params.brand : undefined;
  const hasFilters = Boolean(q || category || brand);

  let results: Row[] = [];
  if (hasFilters) {
    let query = supabase
      .from("products")
      .select("id, name, price_kobo, is_new_arrival, brand:brands(name), product_images(url, is_video, position)")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(SEARCH_LIMIT);
    if (q) query = query.or(`name.ilike.%${q}%,slug.ilike.%${q}%`);
    if (category) query = query.eq("category_id", category);
    if (brand) query = query.eq("brand_id", brand);
    const { data } = await query;
    results = (data as unknown as Row[] | null) ?? [];
  }

  const selectClass = "rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm";

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display mb-1 text-2xl font-bold tracking-tight text-ink">
          Edit New Arrivals
        </h1>
        <p className="text-sm text-ink/60">
          Hand-pick what shows in the homepage&apos;s New Arrivals section. With nothing picked,
          it falls back to the newest in-stock products automatically.
        </p>
      </div>

      <div className="mb-8">
        <h2 className="font-display mb-3 text-lg font-bold text-ink">
          Currently in New Arrivals ({current?.length ?? 0})
        </h2>
        {!current || current.length === 0 ? (
          <p className="text-sm text-ink/60">
            Nothing picked yet — the homepage is showing the newest in-stock products instead.
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
            {(current as unknown as Row[]).map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-neutral-100">
                  {coverUrl(p) && <Image src={coverUrl(p)!} alt="" fill sizes="40px" className="object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-900">{p.name}</p>
                  <p className="truncate text-xs text-neutral-500">
                    {p.brand?.name ?? "No brand"} {p.price_kobo ? `· ${formatNaira(p.price_kobo)}` : ""}
                  </p>
                </div>
                <NewArrivalToggleButton productId={p.id} isNewArrival />
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="font-display mb-3 text-lg font-bold text-ink">Add products</h2>
        <form className="mb-4 flex flex-wrap gap-2">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search by name or slug…"
            className="min-w-0 flex-1 basis-56 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
          />
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
          <button type="submit" className="rounded-full bg-brand-900 px-4 py-2 text-sm font-semibold text-white">
            Search
          </button>
        </form>

        {!hasFilters ? (
          <p className="text-sm text-ink/60">Search or filter to find products to add.</p>
        ) : results.length === 0 ? (
          <p className="text-sm text-ink/60">No published products match.</p>
        ) : (
          <div className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
            {results.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-neutral-100">
                  {coverUrl(p) && <Image src={coverUrl(p)!} alt="" fill sizes="40px" className="object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-900">{p.name}</p>
                  <p className="truncate text-xs text-neutral-500">
                    {p.brand?.name ?? "No brand"} {p.price_kobo ? `· ${formatNaira(p.price_kobo)}` : ""}
                  </p>
                </div>
                <NewArrivalToggleButton productId={p.id} isNewArrival={p.is_new_arrival} />
              </div>
            ))}
            {results.length === SEARCH_LIMIT && (
              <p className="px-4 py-2 text-xs text-ink/50">
                Showing the first {SEARCH_LIMIT} matches — refine your search to narrow further.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
