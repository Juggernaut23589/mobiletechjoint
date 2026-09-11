"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import type { CategoryWithCount } from "@/types/database";

/** Mobile-only hamburger button in the header (md:hidden — desktop keeps
 *  the always-visible sidebar) opening a slide-out drawer with the full
 *  category list. Categories are fetched client-side on first open via
 *  /api/categories rather than server-rendered here, since this lives in
 *  SiteHeader inside the root layout — a data fetch there would apply to
 *  every page in the app.
 *
 *  The drawer/backdrop are portaled to document.body rather than left in
 *  place — SiteHeader has `backdrop-blur-md`, and a `backdrop-filter` (or
 *  `filter`/`transform`) on ANY ancestor creates a new containing block
 *  for `position: fixed` descendants. Left un-portaled, the drawer's
 *  `inset-y-0` resolved against the header's own ~60px box instead of the
 *  actual viewport — confirmed by inspecting its computed height in a
 *  real browser render, not just guessed. */
export function MobileCategoryMenu() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open || loaded) return;
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => {
        setCategories(data.categories ?? []);
        setLoaded(true);
      })
      .catch(() => {});
  }, [open, loaded]);

  // Lock background scroll while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  const drawer = (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-50 bg-black/50 md:hidden"
            aria-hidden="true"
          />
          <motion.div
            key="drawer"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
            className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[80vw] flex-col overflow-y-auto bg-white p-4 shadow-xl md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Categories"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-brand-900">Categories</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close categories menu"
                className="-m-2 p-2 text-neutral-500 hover:text-neutral-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {!loaded ? (
              <p className="text-sm text-neutral-500">Loading…</p>
            ) : categories.length === 0 ? (
              <p className="text-sm text-neutral-500">No categories yet.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {categories.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/category/${c.slug}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm text-neutral-700 hover:bg-brand-50 hover:text-brand-700"
                    >
                      <span>{c.name}</span>
                      <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-400">
                        {c.product_count}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open categories menu"
        className="-m-2 flex items-center p-2 text-white md:hidden"
      >
        <Menu className="h-6 w-6" strokeWidth={2} />
      </button>

      {mounted && createPortal(drawer, document.body)}
    </>
  );
}
