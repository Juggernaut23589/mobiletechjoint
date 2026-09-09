"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import type { ProductWithImages } from "@/types/database";

/** Real product photos (never placeholders), gently bouncing/floating
 *  behind the hero headline. Deterministic per-index variation instead of
 *  Math.random() so there's nothing to get right or wrong between server
 *  and client — it's mount-gated anyway (this whole thing is decorative,
 *  same pattern as CartLink's hydration-safe mount gate), but keeping the
 *  trajectories stable also means they don't jump around on re-render. */
export function BouncingProductBackground({ products }: { products: ProductWithImages[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const thumbs = products
    .map((p) => ({ product: p, image: p.product_images.find((img) => !img.is_video) }))
    .filter((t): t is { product: ProductWithImages; image: NonNullable<typeof t.image> } =>
      Boolean(t.image)
    )
    .slice(0, 12);

  if (!mounted || thumbs.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {thumbs.map((thumb, i) => {
        const size = 44 + (i % 4) * 14;
        const left = (i * 8.7 + (i % 3) * 11) % 92;
        const top = (i * 13.3 + (i % 4) * 9) % 78;
        const duration = 7 + (i % 5) * 1.3;
        const delay = (i % 6) * 0.5;
        const drift = 14 + (i % 3) * 6;

        return (
          <motion.div
            key={thumb.product.id}
            className="absolute overflow-hidden rounded-2xl shadow-glow"
            style={{ width: size, height: size, left: `${left}%`, top: `${top}%` }}
            initial={{ opacity: 0 }}
            animate={{
              opacity: 0.55,
              y: [0, -drift, 0, drift * 0.7, 0],
              x: [0, drift * 0.5, -drift * 0.4, drift * 0.3, 0],
              rotate: [0, 5, -4, 3, 0],
            }}
            transition={{
              opacity: { duration: 1 },
              y: { duration, delay, repeat: Infinity, ease: "easeInOut" },
              x: { duration: duration * 1.15, delay, repeat: Infinity, ease: "easeInOut" },
              rotate: { duration: duration * 1.3, delay, repeat: Infinity, ease: "easeInOut" },
            }}
          >
            <Image
              src={thumb.image.url}
              alt=""
              fill
              sizes="90px"
              className="object-cover"
            />
          </motion.div>
        );
      })}
    </div>
  );
}
