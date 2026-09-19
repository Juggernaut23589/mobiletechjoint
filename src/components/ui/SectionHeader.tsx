import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";

/** One header system for every homepage section: a small coloured
 *  eyebrow, a display heading, optional subtitle, and an optional
 *  right-aligned action. `tone="dark"` flips the palette for sections
 *  that sit on a navy band. */
export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  action,
  tone = "light",
  align = "left",
  className = "",
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: { label: string; href: string };
  tone?: "light" | "dark";
  align?: "left" | "center";
  className?: string;
}) {
  const dark = tone === "dark";
  const centered = align === "center";

  return (
    <RevealOnScroll
      className={`mb-7 flex flex-wrap items-end gap-4 ${
        centered ? "flex-col items-center text-center" : "justify-between"
      } ${className}`}
    >
      <div className={centered ? "max-w-2xl" : "max-w-2xl"}>
        {eyebrow && (
          <span
            className={`mb-2 inline-block text-[11.5px] font-bold uppercase tracking-[0.16em] ${
              dark ? "text-accent-400" : "text-accent-500"
            }`}
          >
            {eyebrow}
          </span>
        )}
        <h2
          className={`font-display text-[26px] font-bold leading-[1.1] tracking-tight sm:text-[32px] ${
            dark ? "text-white" : "text-brand-900"
          }`}
        >
          {title}
        </h2>
        {subtitle && (
          <p
            className={`mt-2 text-[15px] leading-relaxed ${
              dark ? "text-white/60" : "text-neutral-500"
            }`}
          >
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <Link
          href={action.href}
          className={`group inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold transition-colors ${
            dark ? "text-white/80 hover:text-white" : "text-brand-700 hover:text-brand-900"
          }`}
        >
          {action.label}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </RevealOnScroll>
  );
}
