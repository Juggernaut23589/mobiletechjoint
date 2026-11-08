"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import type { Faq } from "@/lib/faqs";

const TOPIC_TINT: Record<Faq["topic"], string> = {
  Products: "#A855F7",
  Ordering: "#2F6FFF",
  Payment: "#16C784",
  Delivery: "#FF6A3D",
  Support: "#FF3B5C",
};

const noopSubscribe = () => () => {};

/** Reads the URL hash without a setState-in-effect: the hash is never sent
 *  to the server, so the server snapshot is always empty and the real
 *  value only exists client-side — same pattern as the reset-password
 *  pages' useResetFragment(). */
function useHashId() {
  return useSyncExternalStore(
    noopSubscribe,
    () => window.location.hash.replace(/^#/, ""),
    () => ""
  );
}

/** Every FAQ, grouped by topic, as an accordion. Opens straight to
 *  whichever question the URL hash points at (e.g. arriving from a
 *  FaqCarousel card's `/faq#<id>` link) and scrolls it into view. */
export function FaqAccordionList({ faqs }: { faqs: Faq[] }) {
  const hashId = useHashId();
  const [toggledId, setToggledId] = useState<string | null | undefined>(undefined);
  // Explicit clicks always win; before any click, fall back to the hash.
  const openId = toggledId !== undefined ? toggledId : hashId || null;

  useEffect(() => {
    if (!hashId) return;
    const el = document.getElementById(hashId);
    // Let the accordion's open render land before scrolling, so the
    // revealed answer ends up in view rather than the (shorter) closed card.
    requestAnimationFrame(() => el?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }, [hashId]);

  const topics = Array.from(new Set(faqs.map((f) => f.topic)));

  return (
    <div className="space-y-10">
      {topics.map((topic) => {
        const tint = TOPIC_TINT[topic];
        const items = faqs.filter((f) => f.topic === topic);
        return (
          <div key={topic}>
            <div className="mb-3 flex items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.14em]"
                style={{ background: `${tint}1a`, color: tint }}
              >
                <HelpCircle className="h-3 w-3" strokeWidth={2.5} />
                {topic}
              </span>
            </div>
            <div className="flex flex-col gap-3">
              {items.map((faq) => {
                const isOpen = openId === faq.id;
                return (
                  <div
                    key={faq.id}
                    id={faq.id}
                    className="scroll-mt-28 rounded-2xl border bg-white transition-colors"
                    style={{ borderColor: isOpen ? tint : "#e5e5e5" }}
                  >
                    <button
                      type="button"
                      onClick={() => setToggledId(isOpen ? null : faq.id)}
                      aria-expanded={isOpen}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                    >
                      <span className="font-display text-[15.5px] font-bold text-brand-900">
                        {faq.question}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                        strokeWidth={2.5}
                      />
                    </button>
                    {isOpen && (
                      <p className="px-5 pb-5 text-[14px] leading-relaxed text-neutral-600">
                        {faq.answer}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
