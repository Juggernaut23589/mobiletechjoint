"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

const OPTIONS: { value: string; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "newest", label: "Newest" },
];

/** Auto-submits on change (progressive enhancement over the main filter
 *  form, which needs its own Apply button since checkboxes/range inputs
 *  shouldn't refetch on every keystroke/drag). */
export function SortSelect({ current }: { current: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", e.target.value);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <select
      value={current}
      onChange={onChange}
      className="rounded-[10px] border border-neutral-200 bg-white px-3 py-2 text-[13.5px] text-neutral-900"
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
