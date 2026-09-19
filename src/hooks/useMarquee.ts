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
 *  half-width so the loop point is invisible. Runs on requestAnimationFrame
 *  and writes the transform directly (no React state per frame), and can be
 *  paused or nudged by exactly one "step" with an eased tween — which is
 *  what lets the FAQ rail have arrow buttons and click-to-freeze without
 *  fighting a CSS animation. Honours prefers-reduced-motion by not
 *  auto-scrolling (the nudge buttons still work). */
export function useMarquee({ speed = 40, direction = "left", paused = false }: MarqueeOptions = {}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const offset = useRef(0);
  const hovering = useRef(false);
  const pausedRef = useRef(paused);
  const tween = useRef<{ from: number; to: number; start: number; duration: number } | null>(null);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let last = performance.now();

    const frame = (now: number) => {
      const track = trackRef.current;
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;

      if (track) {
        const half = track.scrollWidth / 2;
        if (tween.current) {
          const t = Math.min((now - tween.current.start) / tween.current.duration, 1);
          const eased = 1 - Math.pow(1 - t, 3);
          offset.current = tween.current.from + (tween.current.to - tween.current.from) * eased;
          if (t >= 1) tween.current = null;
        } else if (!reduceMotion && !pausedRef.current && !hovering.current) {
          offset.current += (direction === "left" ? -1 : 1) * speed * dt;
        }

        if (half > 0) {
          if (offset.current <= -half) offset.current += half;
          if (offset.current > 0) offset.current -= half;
        }
        track.style.transform = `translate3d(${offset.current}px,0,0)`;
      }
      raf = requestAnimationFrame(frame);
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
