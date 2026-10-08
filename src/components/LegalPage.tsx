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
      <div className="mb-5 text-[13px] text-neutral-500">
        <Link href="/" className="text-brand-600 hover:text-brand-700">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-neutral-900">{title}</span>
      </div>
      <h1 className="font-display mb-2 text-3xl font-bold tracking-tight text-brand-900">
        {title}
      </h1>
      <p className="mb-10 text-sm text-neutral-500">Last updated {updated}</p>
      <div className="flex flex-col gap-6 text-[15px] leading-relaxed text-neutral-700 [&_h2]:font-display [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-brand-900 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5 [&_strong]:font-semibold [&_strong]:text-neutral-900 [&_a]:text-brand-600 [&_a]:underline">
        {children}
      </div>
    </div>
  );
}
