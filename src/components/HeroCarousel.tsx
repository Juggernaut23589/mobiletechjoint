"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { HeroBrandSlide } from "@/lib/products";

const SLIDE_MS = 3500;
/** Each slide's product photos stagger in left-to-right across this
 *  window, rather than all appearing at once. */
const IMAGE_STAGGER_WINDOW_S = 2;

/** Homepage hero carousel: a fixed-height intro slide followed by one
 *  slide per brand with live stock (see getHeroBrandShowcase) — every
 *  slide fills the exact same box so nothing ever looks cropped or
 *  mismatched. Auto-advances every SLIDE_MS; the arrow buttons and dots
 *  below jump directly and reset that timer so manual navigation doesn't
 *  fight the next auto-advance. */
export function HeroCarousel({ brandSlides }: { brandSlides: HeroBrandSlide[] }) {
  const totalSlides = 1 + brandSlides.length;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (totalSlides <= 1) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % totalSlides);
    }, SLIDE_MS);
    return () => clearInterval(timer);
    // Re-armed on every index change (including manual jumps below) so a
    // manual click always gets the full SLIDE_MS before auto-advancing again.
  }, [totalSlides, index]);

  const goTo = useCallback((i: number) => setIndex(((i % totalSlides) + totalSlides) % totalSlides), [totalSlides]);
  const goPrev = useCallback(() => goTo(index - 1), [goTo, index]);
  const goNext = useCallback(() => goTo(index + 1), [goTo, index]);

  return (
    <section className="relative h-[560px] overflow-hidden bg-brand-900 sm:h-[600px]">
      <AnimatePresence mode="sync">
        {index === 0 ? (
          <motion.div
            key="intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0"
          >
            <Image
              src="/hero/slide-1-gear-flatlay.jpg"
              alt="Content creation gear — cameras, lenses, gimbal, lighting, and audio laid out"
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-brand-900 via-brand-900/85 to-brand-900/40" />
            <div className="relative mx-auto flex h-full max-w-[1360px] items-center px-4 sm:px-8">
              <div className="max-w-lg">
                <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-600/35 bg-brand-600/15 px-3.5 py-1.5 text-[12.5px] font-semibold text-brand-200">
                  New drops weekly
                </span>
                <h1 className="font-display mb-4.5 text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl">
                  Gears built for
                  <br />
                  every frame you shoot.
                </h1>
                <p className="mb-7 max-w-md text-base leading-relaxed text-white/70">
                  Cameras, lighting, audio and rigs trusted by creators — from first upload to
                  full-time studio.
                </p>
                <div className="flex flex-wrap gap-3.5">
                  <Link
                    href="/deals"
                    className="rounded-full bg-accent-500 px-6.5 py-3 text-sm font-semibold text-white shadow-glow-accent transition-all hover:-translate-y-0.5 hover:bg-accent-600"
                  >
                    Shop Now
                  </Link>
                  <Link
                    href="/deals"
                    className="rounded-full border border-white/40 px-6 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:border-white hover:bg-white/10"
                  >
                    Explore Deals
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          (() => {
            const slide = brandSlides[index - 1];
            if (!slide) return null;
            const stagger =
              slide.products.length > 1 ? IMAGE_STAGGER_WINDOW_S / (slide.products.length - 1) : 0;
            return (
              <motion.div
                key={slide.brandSlug}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0"
                style={{ background: slide.gradient }}
              >
                <div className="mx-auto flex h-full max-w-[1360px] flex-col-reverse items-center justify-center gap-8 px-4 sm:flex-row sm:justify-between sm:px-8">
                  <div className="max-w-md text-center sm:text-left">
                    <span className="mb-4 inline-block text-[12.5px] font-bold uppercase tracking-[0.1em] text-white/60">
                      Featured Brand
                    </span>
                    <h2 className="font-display mb-3.5 text-4xl font-bold text-white sm:text-5xl">
                      {slide.brandName}
                    </h2>
                    <p className="mb-7 text-base leading-relaxed text-white/70">{slide.tagline}</p>
                    <Link
                      href={`/search?q=${encodeURIComponent(slide.brandName)}`}
                      className="inline-block rounded-full bg-white px-6.5 py-3 text-sm font-semibold text-brand-900 transition-all hover:-translate-y-0.5 hover:bg-white/90"
                    >
                      Shop {slide.brandName} →
                    </Link>
                  </div>

                  <div className="flex shrink-0 gap-3 sm:gap-4">
                    {slide.products.map((p, i) => (
                      <motion.div
                        key={p.imageUrl}
                        initial={{ opacity: 0, x: -24 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: i * stagger }}
                        className="relative h-[190px] w-[120px] shrink-0 overflow-hidden rounded-2xl bg-white p-4 shadow-2xl sm:h-[280px] sm:w-[190px]"
                      >
                        <Image
                          src={p.imageUrl}
                          alt={p.name}
                          fill
                          sizes="190px"
                          className="object-contain p-3"
                        />
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            );
          })()
        )}
      </AnimatePresence>

      {totalSlides > 1 && (
        <>
          <button
            type="button"
            onClick={goPrev}
            aria-label="Previous slide"
            className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20 sm:left-6"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label="Next slide"
            className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20 sm:right-6"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 gap-2">
            {Array.from({ length: totalSlides }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === index}
                className={`h-2 rounded-full transition-all ${
                  i === index ? "w-6 bg-white" : "w-2 bg-white/40 hover:bg-white/60"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
