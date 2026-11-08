"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, ArrowUpRight, HelpCircle } from "lucide-react";
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

/** FAQ cards on a continuous left-to-right rail. Hovering a card pauses
 *  the rail so it can be read; clicking one (or pressing Enter/Space on
 *  it) takes the reader to the full FAQ page at /faq#<id>, which opens
 *  straight to that question. The arrows step the rail one card at a
 *  time in either direction. */
export function FaqCarousel({ faqs }: { faqs: Faq[] }) {
  const { trackRef, nudge, hoverProps } = useMarquee({ speed: 30, direction: "right" });

  if (faqs.length === 0) return null;

  function step(dir: 1 | -1) {
    const card = trackRef.current?.firstElementChild as HTMLElement | null;
    const width = (card?.offsetWidth ?? 340) + GAP_PX;
    nudge(-dir * width);
  }

  const loop = [...faqs, ...faqs];

  return (
    <section id="faq" className="relative overflow-hidden bg-brand-50/60 py-[51px] sm:py-16">
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
          subtitle="Straight answers on originality, ordering, payment, delivery and after-sales support. Tap a card for the full FAQ page."
          action={{ label: "See all FAQs", href: "/faq" }}
        />
      </div>

      <div className="relative">
        <div
          {...hoverProps}
          className="marquee-fade-mask -my-[26px] overflow-hidden py-[38px] [container-type:inline-size]"
        >
          <div ref={trackRef} className="flex w-max gap-5 px-4 will-change-transform sm:px-8">
            {loop.map((faq, i) => {
              const key = `${faq.id}-${i < faqs.length ? "a" : "b"}`;
              const tint = TOPIC_TINT[faq.topic];
              return (
                <Link
                  key={key}
                  href={`/faq#${faq.id}`}
                  className="group relative flex w-[82cqw] shrink-0 flex-col rounded-[22px] border border-neutral-200/70 bg-white p-6 text-left shadow-[0_8px_24px_-16px_rgba(11,14,20,0.25)] transition-all hover:-translate-y-1 hover:border-transparent hover:shadow-[0_28px_60px_-20px_rgba(11,14,20,0.45)] sm:w-[calc((100cqw-4rem-20px)/2)] lg:w-[calc((100cqw-4rem-40px)/3)]"
                  style={{ transformOrigin: "center" }}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.14em]"
                      style={{ background: `${tint}1a`, color: tint }}
                    >
                      <HelpCircle className="h-3 w-3" strokeWidth={2.5} />
                      {faq.topic}
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-neutral-300 transition-colors group-hover:text-neutral-500" strokeWidth={2.5} />
                  </div>

                  <h3 className="font-display text-[17px] font-bold leading-snug tracking-tight text-brand-900">
                    {faq.question}
                  </h3>

                  <p className="mt-3 line-clamp-3 text-[14px] leading-relaxed text-neutral-500">
                    {faq.answer}
                  </p>

                  <div
                    className="absolute inset-x-6 bottom-0 h-[3px] rounded-t-full opacity-80"
                    style={{ background: tint }}
                    aria-hidden="true"
                  />
                </Link>
              );
            })}
          </div>
        </div>

        <div className="mx-auto mt-[19px] flex max-w-[1360px] items-center justify-between px-4 sm:px-8">
          <p className="text-xs text-neutral-400">Auto-scrolling · click a card for the full answer</p>
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
