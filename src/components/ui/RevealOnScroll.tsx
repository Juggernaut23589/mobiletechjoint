"use client";

import { motion } from "framer-motion";

/** Fades + slides content up as it enters the viewport. Wraps section
 *  headers and grids across the storefront so scrolling the page feels
 *  alive instead of everything just being there at once. `once` so it
 *  never re-triggers on scroll-back, which reads as jittery rather than
 *  polished. */
export function RevealOnScroll({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
