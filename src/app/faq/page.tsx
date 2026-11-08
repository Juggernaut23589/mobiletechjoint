import type { Metadata } from "next";
import Link from "next/link";
import { FAQS } from "@/lib/faqs";
import { FaqAccordionList } from "@/components/FaqAccordionList";

export const metadata: Metadata = {
  title: "FAQs",
  description:
    "Straight answers on product originality, ordering, payment, delivery, warranty and returns at MobileTechJoint.",
};

export default function FaqPage() {
  return (
    <div className="bg-brand-50/60 pb-20 pt-10 sm:pt-14">
      <div className="mx-auto max-w-[860px] px-4 sm:px-8">
        <nav className="mb-6 text-xs text-neutral-400">
          <Link href="/" className="hover:text-neutral-600">Home</Link>
          <span className="mx-1.5">/</span>
          <span className="text-neutral-500">FAQs</span>
        </nav>

        <span className="mb-2 inline-block text-[11.5px] font-bold uppercase tracking-[0.16em] text-brand-600">
          Before you buy
        </span>
        <h1 className="font-display mb-3 text-[32px] font-bold leading-[1.1] tracking-tight text-brand-900 sm:text-[40px]">
          Frequently asked questions
        </h1>
        <p className="mb-10 max-w-[60ch] text-[15px] leading-relaxed text-neutral-500">
          Everything we get asked about originality, ordering, payment, delivery and after-sales
          support. Can&apos;t find what you&apos;re after?{" "}
          <Link href="/contact" className="font-semibold text-brand-600 hover:underline">
            Reach our team
          </Link>{" "}
          and we&apos;ll answer directly.
        </p>

        <FaqAccordionList faqs={FAQS} />
      </div>
    </div>
  );
}
