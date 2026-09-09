"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { forwardRef } from "react";

const VARIANTS = {
  primary:
    "bg-accent-gradient text-brand-900 shadow-glow-accent hover:brightness-105",
  secondary:
    "border border-brand-700 text-brand-700 bg-white hover:bg-brand-50",
  dark: "bg-brand-gradient text-white shadow-glow hover:brightness-110",
  ghost: "text-neutral-500 hover:text-brand-700",
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
