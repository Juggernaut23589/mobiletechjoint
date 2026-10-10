"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search } from "lucide-react";
import { formatNaira } from "@/lib/money";

interface Suggestion {
  id: string;
  slug: string;
  name: string;
  priceKobo: number | null;
  imageUrl: string | null;
  brandName: string | null;
}

/** Navbar search box with a live top-10 suggestions dropdown. Still a real
 *  <form action="/search"> underneath — Enter or the search icon always
 *  works and lands on the full /search results page; the dropdown is a
 *  client-side shortcut on top of that, not a replacement for it. */
export function SearchBar({ id, className = "" }: { id?: string; className?: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;

    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/search/suggest?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data) => setResults(data.results ?? []))
        .catch((err) => {
          if (err.name !== "AbortError") setResults([]);
        });
    }, 200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const showDropdown = open && query.trim().length >= 2;

  return (
    <form
      ref={rootRef}
      action="/search"
      method="GET"
      className={`relative ${className}`}
      onSubmit={() => setOpen(false)}
    >
      <input
        id={id}
        type="text"
        name="q"
        autoComplete="off"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="Search cameras, mics, gimbals..."
        className="w-full rounded-full border border-white/10 bg-[#181C26] py-2.5 pl-9 pr-4 text-[13.5px] text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-brand-600"
      />
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7A8299]"
        strokeWidth={2}
      />

      {showDropdown && results.length > 0 && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl">
          <ul className="max-h-[60vh] overflow-y-auto py-1.5">
            {results.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/products/${item.slug}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-3.5 py-2 hover:bg-neutral-50"
                >
                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                    {item.imageUrl ? (
                      <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    {item.brandName && (
                      <p className="truncate text-[10.5px] font-bold uppercase tracking-wide text-brand-600">
                        {item.brandName}
                      </p>
                    )}
                    <p className="truncate text-[13px] font-medium text-neutral-900">{item.name}</p>
                  </div>
                  <p className="shrink-0 text-[13px] font-semibold text-brand-900">
                    {formatNaira(item.priceKobo ?? 0)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href={`/search?q=${encodeURIComponent(query.trim())}`}
            onClick={() => setOpen(false)}
            className="block border-t border-neutral-100 px-3.5 py-2.5 text-center text-[12.5px] font-semibold text-brand-600 hover:bg-neutral-50 hover:text-brand-700"
          >
            See all results for &ldquo;{query.trim()}&rdquo;
          </Link>
        </div>
      )}
    </form>
  );
}
