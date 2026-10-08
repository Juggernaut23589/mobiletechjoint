import Link from "next/link";

/** Shared chrome for the legal/policy pages (Privacy, Terms, Returns) —
 *  breadcrumb, title, "last updated" line, and a prose-width column so
 *  long-form text stays readable instead of stretching full-width. */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-8 sm:py-16">
      <div className="mb-5 text-[13px] text-white/50">
        <Link href="/" className="text-accent-400 hover:text-white">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-white">{title}</span>
      </div>
      <h1 className="font-display mb-2 text-3xl font-bold tracking-tight text-white">
        {title}
      </h1>
      <p className="mb-10 text-sm text-white/50">Last updated {updated}</p>
      <div className="flex flex-col gap-6 text-[15px] leading-relaxed text-white/70 [&_h2]:font-display [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-white [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5 [&_strong]:font-semibold [&_strong]:text-white [&_a]:text-accent-400 [&_a]:underline">
        {children}
      </div>
    </div>
  );
}
