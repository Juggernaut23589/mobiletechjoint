"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { linkVariant, searchProductsForStaff, setVariantLabel, unlinkVariant } from "@/app/actions/admin-products";
import { ProductPicker } from "@/components/staff/ProductPicker";

interface Member {
  id: string;
  name: string;
  label: string | null;
  status: string;
}

/** Links products that are versions of one another (e.g. lens mounts), so
 *  the storefront shows "Also available for: …" switch buttons. */
export function VariantsPanel({ productId, members }: { productId: string; members: Member[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<{ error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res.error) setError(res.error);
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 text-sm">
      <p className="mb-1 font-medium text-neutral-900">Variants</p>
      <p className="mb-3 text-xs text-neutral-500">
        Link other versions of this product (mount, colour, kit). Each keeps its own price and stock;
        the product page shows buttons to switch between them. Labels are what shoppers see, e.g.
        &quot;Sony E&quot;.
      </p>

      {members.length > 0 && (
        <ul className="mb-3 divide-y divide-neutral-100 rounded-md border border-neutral-200">
          {members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
              <input
                defaultValue={m.label ?? ""}
                placeholder="Label"
                onBlur={(e) => {
                  if (e.target.value.trim() !== (m.label ?? "")) run(() => setVariantLabel(m.id, e.target.value));
                }}
                className="w-28 rounded border border-neutral-300 px-2 py-1 text-xs"
              />
              <span className="min-w-0 flex-1 truncate text-xs">
                {m.id === productId ? (
                  <strong>{m.name} (this product)</strong>
                ) : (
                  <Link href={`/staff/dashboard/products/${m.id}/edit`} className="hover:underline">
                    {m.name}
                  </Link>
                )}
                {m.status !== "published" && <span className="ml-1 text-neutral-400">· {m.status}, hidden in shop</span>}
              </span>
              <button
                type="button"
                disabled={isPending}
                onClick={() => run(() => unlinkVariant(m.id))}
                className="text-xs text-neutral-400 hover:text-red-600"
              >
                Unlink
              </button>
            </li>
          ))}
        </ul>
      )}

      <ProductPicker
        search={searchProductsForStaff}
        placeholder="Search for another version to link…"
        excludeIds={[productId, ...members.map((m) => m.id)]}
        onPick={(p) => run(() => linkVariant(productId, p.id))}
      />
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
