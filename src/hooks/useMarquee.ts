"use client";

import { useCallback, useEffect, useRef } from "react";

interface MarqueeOptions {
  /** Pixels per second. */
  speed?: number;
  /** "left": content travels right-to-left. "right": left-to-right. */
  direction?: "left" | "right";
  paused?: boolean;
}

/** Drives a seamless, infinitely-looping horizontal marquee on a track
 *  whose content is rendered TWICE back-to-back. The translate wraps every
 *  half-width so the loop point is invisible.
 *
 *  Performance notes, learned the hard way: the loop must never read a
 *  layout property (scrollWidth/offsetWidth/getBoundingClientRect) inside
 *  requestAnimationFrame. Doing so forces a synchronous reflow every
 *  frame, and on a page with dozens of images still streaming in — where
 *  layout is invalidated constantly — two such marquees saturate the main
 *  thread and lock the tab up entirely. Instead the half-width is measured
 *  once via ResizeObserver and cached, and the loop only writes a
 *  transform. An IntersectionObserver also parks the animation whenever
 *  the rail is offscreen, so a marquee near the footer costs nothing while
 *  someone is reading the top of the page. */
export function useMarquee({ speed = 40, direction = "left", paused = false }: MarqueeOptions = {}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const offset = useRef(0);
  const halfWidth = useRef(0);
  const hovering = useRef(false);
  const onScreen = useRef(true);
  const pausedRef = useRef(paused);
  const tween = useRef<{ from: number; to: number; start: number; duration: number } | null>(null);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  // Measure once, then only when the track actually resizes (images
  // finishing load, viewport changes, font swap).
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const measure = () => {
      halfWidth.current = track.scrollWidth / 2;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(track);
    for (const child of Array.from(track.children)) ro.observe(child);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        onScreen.current = entry.isIntersecting;
      },
      { rootMargin: "200px" }
    );
    io.observe(track.parentElement ?? track);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let last = performance.now();

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const track = trackRef.current;
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      if (!track) return;

      const half = halfWidth.current;
      const tweening = tween.current !== null;

      // Nothing to do: don't touch the DOM at all.
      if (!tweening && (reduceMotion || pausedRef.current || hovering.current || !onScreen.current)) {
        return;
      }

      if (tween.current) {
        const t = Math.min((now - tween.current.start) / tween.current.duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        offset.current = tween.current.from + (tween.current.to - tween.current.from) * eased;
        if (t >= 1) tween.current = null;
      } else {
        offset.current += (direction === "left" ? -1 : 1) * speed * dt;
      }

      if (half > 0) {
        if (offset.current <= -half) offset.current += half;
        if (offset.current > 0) offset.current -= half;
      }
      track.style.transform = `translate3d(${offset.current}px,0,0)`;
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [speed, direction]);

  const nudge = useCallback((deltaPx: number) => {
    tween.current = {
      from: offset.current,
      to: offset.current + deltaPx,
      start: performance.now(),
      duration: 450,
    };
  }, []);

  // Touch has no hover: a finger on the rail pauses it, and it resumes a
  // beat after the finger lifts so a tap has time to land on a card.
  const hoverProps = {
    onMouseEnter: () => {
      hovering.current = true;
    },
    onMouseLeave: () => {
      hovering.current = false;
    },
    onTouchStart: () => {
      hovering.current = true;
    },
    onTouchEnd: () => {
      setTimeout(() => {
        hovering.current = false;
      }, 1500);
    },
  };

  return { trackRef, nudge, hoverProps };
}
