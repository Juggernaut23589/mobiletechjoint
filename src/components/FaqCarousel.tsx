"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X, HelpCircle } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useMarquee } from "@/hooks/useMarquee";
import type { Faq } from "@/lib/faqs";

const GAP_PX = 20;

const TOPIC_TINT: Record<Faq["topic"], string> = {
  Products: "#A855F7",
  Ordering: "#2F6FFF",
  Payment: "#16C784",
  Delivery: "#FF6A3D",
  Support: "#FF3B5C",
};

/** FAQ cards on a continuous left-to-right rail. Clicking a card freezes
 *  the rail and "pops" that card — it lifts, scales up and takes the
 *  topic colour; clicking it again, its close button, Escape, or anywhere
 *  outside the rail lets everything move again. Answers are always fully
 *  rendered (cards stretch to the tallest) so pinning never shifts layout
 *  inside the translated track. The arrows step the rail one card at a
 *  time in either direction. */
export function FaqCarousel({ faqs }: { faqs: Faq[] }) {
  const [active, setActive] = useState<string | null>(null);
  const { trackRef, nudge, hoverProps } = useMarquee({
    speed: 30,
    direction: "right",
    paused: active !== null,
  });

  useEffect(() => {
    if (active === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  if (faqs.length === 0) return null;

  function step(dir: 1 | -1) {
    const card = trackRef.current?.firstElementChild as HTMLElement | null;
    const width = (card?.offsetWidth ?? 340) + GAP_PX;
    nudge(-dir * width);
  }

  const loop = [...faqs, ...faqs];

  return (
    <section
      id="faq"
      className="relative overflow-hidden bg-brand-50/60 py-16 sm:py-20"
      onClick={() => setActive(null)}
    >
      <div
        className="pointer-events-none absolute -left-32 top-10 h-72 w-72 rounded-full bg-brand-200/40 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-24 bottom-0 h-64 w-64 rounded-full bg-accent-400/20 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-[1360px] px-4 sm:px-8">
        <SectionHeader
          eyebrow="Before you buy"
          title="Frequently asked questions"
          subtitle="Straight answers on originality, ordering, payment, delivery and after-sales support. Tap a card to pin it while you read."
        />
      </div>

      <div className="relative">
        <div
          {...hoverProps}
          className="marquee-fade-mask -my-8 overflow-hidden py-12 [container-type:inline-size]"
          onClick={(e) => e.stopPropagation()}
        >
          <div ref={trackRef} className="flex w-max gap-5 px-4 will-change-transform sm:px-8">
            {loop.map((faq, i) => {
              const key = `${faq.id}-${i < faqs.length ? "a" : "b"}`;
              // Pin by FAQ id, not by copy: the seamless wrap can swap the
              // visible copy mid-pin, and both copies must agree.
              const isActive = active === faq.id;
              const tint = TOPIC_TINT[faq.topic];
              return (
                <motion.article
                  key={key}
                  onClick={() => setActive(isActive ? null : faq.id)}
                  animate={{ scale: isActive ? 1.07 : 1, y: isActive ? -10 : 0 }}
                  transition={{ type: "spring", stiffness: 320, damping: 26 }}
                  className={`relative flex w-[82cqw] shrink-0 cursor-pointer select-none flex-col rounded-[22px] border bg-white p-6 text-left transition-shadow sm:w-[calc((100cqw-4rem-20px)/2)] lg:w-[calc((100cqw-4rem-40px)/3)] ${
                    isActive
                      ? "z-10 border-transparent shadow-[0_28px_60px_-20px_rgba(11,14,20,0.45)]"
                      : "border-neutral-200/70 shadow-[0_8px_24px_-16px_rgba(11,14,20,0.25)] hover:border-neutral-300"
                  }`}
                  style={{ transformOrigin: "center", borderColor: isActive ? tint : undefined }}
                  aria-expanded={isActive}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setActive(isActive ? null : faq.id);
                    }
                  }}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.14em]"
                      style={{ background: `${tint}1a`, color: tint }}
                    >
                      <HelpCircle className="h-3 w-3" strokeWidth={2.5} />
                      {faq.topic}
                    </span>
                    {isActive ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActive(null);
                        }}
                        aria-label="Close answer"
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                      >
                        <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                      </button>
                    ) : (
                      <span className="text-[11px] font-semibold text-neutral-400">Tap to pin</span>
                    )}
                  </div>

                  <h3 className="font-display text-[17px] font-bold leading-snug tracking-tight text-brand-900">
                    {faq.question}
                  </h3>

                  <p
                    className={`mt-3 text-[14px] leading-relaxed transition-colors ${
                      isActive ? "text-neutral-700" : "text-neutral-500"
                    }`}
                  >
                    {faq.answer}
                  </p>

                  <div
                    className="absolute inset-x-6 bottom-0 h-[3px] rounded-t-full opacity-80"
                    style={{ background: tint }}
                    aria-hidden="true"
                  />
                </motion.article>
              );
            })}
          </div>
        </div>

        <div
          className="mx-auto mt-6 flex max-w-[1360px] items-center justify-between px-4 sm:px-8"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-xs text-neutral-400">
            {active ? "Paused — click the card again or press Esc to resume" : "Auto-scrolling · tap a card to pause"}
          </p>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Move cards left"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white transition-colors hover:border-brand-900 hover:bg-brand-900 [&:hover_svg]:stroke-white"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Move cards right"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white transition-colors hover:border-brand-900 hover:bg-brand-900 [&:hover_svg]:stroke-white"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
