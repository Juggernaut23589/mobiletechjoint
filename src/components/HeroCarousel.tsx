"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import type { HeroBrandSlide } from "@/lib/products";

const SLIDE_MS = 2300;

/** Homepage hero carousel: a fixed-height intro slide followed by one
 *  slide per brand with live stock (see getHeroBrandShowcase) — every
 *  slide fills the exact same box so nothing ever looks cropped or
 *  mismatched as it auto-advances. Paused on hover so the CTAs are
 *  actually clickable, not a moving target. */
export function HeroCarousel({ brandSlides }: { brandSlides: HeroBrandSlide[] }) {
  const totalSlides = 1 + brandSlides.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || totalSlides <= 1) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % totalSlides);
    }, SLIDE_MS);
    return () => clearInterval(timer);
  }, [paused, totalSlides]);

  return (
    <section
      className="relative h-[560px] overflow-hidden bg-brand-900 sm:h-[600px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
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
                  Gear built for
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

                  <div className="flex shrink-0 gap-4 sm:gap-5">
                    {slide.products.map((p) => (
                      <div
                        key={p.imageUrl}
                        className="relative h-[220px] w-[170px] shrink-0 overflow-hidden rounded-2xl bg-white p-5 shadow-2xl sm:h-[300px] sm:w-[230px]"
                      >
                        <Image
                          src={p.imageUrl}
                          alt={p.name}
                          fill
                          sizes="230px"
                          className="object-contain p-4"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            );
          })()
        )}
      </AnimatePresence>
    </section>
  );
}
