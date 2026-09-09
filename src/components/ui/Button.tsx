"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { forwardRef } from "react";

// Flat, solid fills rather than gradients — Apple's own CTAs (a single
// blue, occasionally black) rather than the more "energetic ecommerce"
// gradient buttons this started as. Deal badges / the hero carousel /
// category tiles are unaffected — see globals.css's separate --color-merch
// tokens for those.
const VARIANTS = {
  primary: "bg-brand-600 text-white shadow-glow hover:bg-brand-700",
  secondary:
    "border border-neutral-300 text-ink bg-white hover:border-brand-600 hover:text-brand-600",
  dark: "bg-brand-900 text-white shadow-glow hover:brightness-125",
  ghost: "text-neutral-500 hover:text-brand-600",
} as const;

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "ref"> {
  variant?: keyof typeof VARIANTS;
}

/** Shared CTA button — gradient fills, a soft colored shadow instead of a
 *  flat one, and a spring tap/hover so every primary action in the store
 *  feels the same. Used across product cards, checkout, cart, and forms. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", className = "", children, ...props },
  ref
) {
  return (
    <motion.button
      ref={ref}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
});
