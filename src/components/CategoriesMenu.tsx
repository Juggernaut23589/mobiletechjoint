"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

/** "Categories" trigger for the secondary nav bar (see CategoryBar.tsx) —
 *  opens a two-column dropdown: category list on the left, and on the
 *  right, every photographed brand for whichever category is hovered
 *  (scrollable once the panel's max height fills up), each linking
 *  straight through to that brand's page. Brand previews are
 *  fetched lazily per category and cached in state so re-hovering one
 *  already seen this session doesn't refetch.
 *
 *  Rendered through a portal, centered in the viewport and sized to match
 *  the desktop search bar's own rendered width exactly (per the business's
 *  request) — measured from the DOM via SEARCH_FORM_ID rather than hardcoded,
 *  so it stays correct if the header layout changes. Click-to-open/close
 *  mirrors SearchBar's outside-click pattern; mobile keeps using
 *  MobileCategoryMenu's slide-out drawer instead of this. */
const SEARCH_FORM_ID = "mtj-desktop-search-form";

export function CategoriesMenu() {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [previews, setPreviews] = useState<Record<string, BrandPreview[]>>({});
  const [panelStyle, setPanelStyle] = useState<{ top: number; left: number; width: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

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
      const target = e.target as Node;
      if (
        rootRef.current &&
        !rootRef.current.contains(target) &&
        panelRef.current &&
        !panelRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function measure() {
    const trigger = rootRef.current;
    const searchForm = document.getElementById(SEARCH_FORM_ID);
    if (!trigger) return;
    const triggerRect = trigger.getBoundingClientRect();
    // Falls back to the trigger's own width (e.g. on a layout where the
    // desktop search form isn't mounted) rather than rendering nothing.
    const width = searchForm?.getBoundingClientRect().width ?? 820;
    setPanelStyle({
      top: triggerRect.bottom + 12,
      left: Math.max(12, (window.innerWidth - width) / 2),
      width,
    });
  }

  useEffect(() => {
    if (!open) return;
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open]);

  const activePreview = activeCategoryId ? previews[activeCategoryId] : undefined;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        aria-expanded={open}
        className="flex items-center gap-1.5 text-sm font-medium text-[#C7CCDA] transition-colors hover:text-white"
      >
        Categories
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open &&
        panelStyle &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={panelRef}
            className="fixed z-50 flex overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl"
            style={{ top: panelStyle.top, left: panelStyle.left, width: panelStyle.width }}
          >
            <ul className="max-h-[70vh] w-[200px] shrink-0 overflow-y-auto border-r border-neutral-100 py-2">
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

            <div className="min-w-0 flex-1 overflow-y-auto p-4" style={{ maxHeight: "70vh" }}>
              {!activePreview ? (
                <p className="px-1 py-2 text-sm text-neutral-400">
                  {activeCategoryId ? "Loading brands…" : "Hover a category"}
                </p>
              ) : activePreview.length === 0 ? (
                <p className="px-1 py-2 text-sm text-neutral-400">No brands yet in this category.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2.5">
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
          </div>,
          document.body
        )}
    </div>
  );
}

export { SEARCH_FORM_ID };
