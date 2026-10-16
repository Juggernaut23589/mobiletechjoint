"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import type { CategoryWithCount } from "@/types/database";

interface BrandPreview {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
}

/** Desktop-only "Categories" button next to DesktopNav's inline links —
 *  opens a two-column dropdown: category list on the left, and on the
 *  right, 3-4 brand thumbnails for whichever category is hovered, each
 *  linking straight through to that brand's page. Brand previews are
 *  fetched lazily per category and cached in state so re-hovering one
 *  already seen this session doesn't refetch. Click-to-open/close mirrors
 *  SearchBar's outside-click pattern; mobile keeps using
 *  MobileCategoryMenu's slide-out drawer instead of this. */
export function CategoriesMenu() {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [previews, setPreviews] = useState<Record<string, BrandPreview[]>>({});
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || loaded) return;
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data: { categories?: CategoryWithCount[] }) => {
        const list = data.categories ?? [];
        setCategories(list);
        setLoaded(true);
        setActiveCategoryId((current) => current ?? list[0]?.id ?? null);
      })
      .catch(() => setLoaded(true));
  }, [open, loaded]);

  useEffect(() => {
    if (!activeCategoryId || previews[activeCategoryId]) return;
    let cancelled = false;
    fetch(`/api/categories/${activeCategoryId}/brand-previews`)
      .then((res) => res.json())
      .then((data: { brands?: BrandPreview[] }) => {
        if (!cancelled) setPreviews((p) => ({ ...p, [activeCategoryId]: data.brands ?? [] }));
      })
      .catch(() => {
        if (!cancelled) setPreviews((p) => ({ ...p, [activeCategoryId]: [] }));
      });
    return () => {
      cancelled = true;
    };
  }, [activeCategoryId, previews]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activePreview = activeCategoryId ? previews[activeCategoryId] : undefined;

  return (
    <div ref={rootRef} className="relative hidden lg:block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        aria-expanded={open}
        className="flex items-center gap-1.5 text-base font-medium text-[#C7CCDA] transition-colors hover:text-white"
      >
        Categories
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+12px)] z-50 flex w-[560px] max-w-[85vw] overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl">
          <ul className="w-[200px] shrink-0 border-r border-neutral-100 py-2">
            {!loaded ? (
              <li className="px-4 py-2.5 text-sm text-neutral-400">Loading…</li>
            ) : categories.length === 0 ? (
              <li className="px-4 py-2.5 text-sm text-neutral-400">No categories yet.</li>
            ) : (
              categories.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/category/${c.slug}`}
                    onClick={() => setOpen(false)}
                    onMouseEnter={() => setActiveCategoryId(c.id)}
                    className={`block px-4 py-2.5 text-sm font-medium transition-colors ${
                      c.id === activeCategoryId
                        ? "bg-neutral-50 text-brand-700"
                        : "text-neutral-700 hover:bg-neutral-50 hover:text-brand-700"
                    }`}
                  >
                    {c.name}
                  </Link>
                </li>
              ))
            )}
          </ul>

          <div className="min-w-0 flex-1 p-4">
            {!activePreview ? (
              <p className="px-1 py-2 text-sm text-neutral-400">
                {activeCategoryId ? "Loading brands…" : "Hover a category"}
              </p>
            ) : activePreview.length === 0 ? (
              <p className="px-1 py-2 text-sm text-neutral-400">No brands yet in this category.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {activePreview.map((brand) => (
                  <Link
                    key={brand.id}
                    href={`/brand/${brand.slug}`}
                    onClick={() => setOpen(false)}
                    className="group flex items-center gap-2.5 rounded-lg p-1.5 hover:bg-neutral-50"
                  >
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                      {brand.imageUrl && (
                        <Image src={brand.imageUrl} alt="" fill sizes="44px" className="object-cover" />
                      )}
                    </div>
                    <span className="truncate text-[13px] font-medium text-neutral-800 group-hover:text-brand-700">
                      {brand.name}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
