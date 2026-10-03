"use client";

import { useEffect, useState } from "react";
import { searchPurchasableProducts, type PurchasableProduct } from "@/app/actions/staff-purchasing";
import { formatNaira } from "@/lib/money";

/** Type-to-search over the catalogue (server-side, top 15 matches). */
export function ProductPicker({
  onPick,
  excludeIds = [],
  search = searchPurchasableProducts,
  placeholder = "Search products to add…",
}: {
  onPick: (product: PurchasableProduct) => void;
  excludeIds?: string[];
  search?: (query: string) => Promise<PurchasableProduct[]>;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PurchasableProduct[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      const found = await search(query);
      if (!cancelled) {
        setResults(found);
        setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, search]);

  const visible = query.trim().length < 2 ? [] : results.filter((r) => !excludeIds.includes(r.id));

  return (
    <div className="relative">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
      />
      {loading && <span className="absolute right-3 top-2.5 text-xs text-neutral-400">Searching…</span>}
      {visible.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-neutral-200 bg-white shadow-lg">
          {visible.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => {
                  onPick(p);
                  setQuery("");
                  setResults([]);
                }}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-brand-50"
              >
                <span className="min-w-0 truncate">
                  {p.name}
                  {p.brand && <span className="ml-1 text-xs text-neutral-400">{p.brand}</span>}
                </span>
                <span className="shrink-0 text-xs text-neutral-500">
                  Stock {p.stock}
                  {p.costKobo !== null && ` · cost ${formatNaira(p.costKobo)}`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
