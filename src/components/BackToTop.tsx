"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

/** Appears once the page has been scrolled a full viewport height — the
 *  homepage runs to 25+ screen-heights with no other wayfinding, so this
 *  is the cheapest way back without adding real navigation structure. */
export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > window.innerHeight);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
      className="fixed bottom-6 right-5 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-brand-900 text-white shadow-lg transition-opacity hover:opacity-90 sm:bottom-8 sm:right-8"
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}
