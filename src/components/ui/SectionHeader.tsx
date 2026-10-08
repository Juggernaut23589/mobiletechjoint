import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";

/** One header system for every homepage section: a small coloured
 *  eyebrow, a display heading, optional subtitle, and an optional
 *  right-aligned action. Always light-on-dark now that the whole page is
 *  black — the old light/dark "tone" prop (for a navy band on an
 *  otherwise-white page) no longer has a reason to exist now that there's
 *  no light page to contrast it against. */
export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  action,
  align = "left",
  className = "",
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: { label: string; href: string };
  align?: "left" | "center";
  className?: string;
}) {
  const centered = align === "center";

  return (
    <RevealOnScroll
      className={`mb-7 flex flex-wrap items-end gap-4 ${
        centered ? "flex-col items-center text-center" : "justify-between"
      } ${className}`}
    >
      <div className={centered ? "max-w-2xl" : "max-w-2xl"}>
        {eyebrow && (
          <span className="mb-2 inline-block text-[11.5px] font-bold uppercase tracking-[0.16em] text-accent-400">
            {eyebrow}
          </span>
        )}
        <h2 className="font-display text-[26px] font-bold leading-[1.1] tracking-tight text-white sm:text-[32px]">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-2 text-[15px] leading-relaxed text-white/60">
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <Link
          href={action.href}
          className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-white/80 transition-colors hover:text-white"
        >
          {action.label}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </RevealOnScroll>
  );
}
