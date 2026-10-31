import type { Metadata } from "next";
import Link from "next/link";
import { Mail, Phone, MapPin } from "lucide-react";
import { SocialLinks, WhatsAppLink } from "@/components/SocialLinks";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with MobileTechJoint.",
};

// This page reads server-only env vars (SUPPORT_EMAIL, WHATSAPP_NUMBER,
// the social URLs, etc.) that the build step never has access to (see
// .github/workflows/deploy.yml — only a specific whitelist is passed to
// `next build`). Without a revalidate window this would statically bake
// in whatever those vars happened to be (nothing) at build time and never
// pick up the real values the VM's .env.production.local sets at
// runtime — same reasoning as the homepage's `revalidate = 60`.
export const revalidate = 60;

/** Dedicated contact page — same no-fabricated-details pattern as
 *  SiteFooter: every contact row only renders when its env var is
 *  actually set (SUPPORT_EMAIL, SUPPORT_PHONE, SUPPORT_PHONE_2,
 *  SUPPORT_ADDRESS, WHATSAPP_NUMBER, plus the social platform URLs in
 *  SocialLinks). Nothing here is a guess at real business details. */
export default function ContactPage() {
  const supportEmail = process.env.SUPPORT_EMAIL;
  const supportPhone = process.env.SUPPORT_PHONE;
  const supportPhone2 = process.env.SUPPORT_PHONE_2;
  const supportAddress = process.env.SUPPORT_ADDRESS;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-8 sm:py-16">
      <div className="mb-5 text-[13px] text-ink/50">
        <Link href="/" className="text-link hover:text-ink">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink">Contact Us</span>
      </div>
      <h1 className="font-display mb-2 text-3xl font-bold tracking-tight text-ink">
        Contact Us
      </h1>
      <p className="mb-10 max-w-xl text-[15px] leading-relaxed text-ink/70">
        Questions about an order, a product, or anything else — we&apos;re happy to help.
      </p>

      <div className="flex flex-col gap-3 text-[15px]">
        <WhatsAppLink className="rounded-2xl border border-ink/10 bg-ink/[0.03] px-5 py-4 text-ink/80" />
        {supportEmail && (
          <a
            href={`mailto:${supportEmail}`}
            className="flex items-center gap-3 rounded-2xl border border-ink/10 bg-ink/[0.03] px-5 py-4 text-ink/80 hover:text-ink"
          >
            <Mail className="h-5 w-5 shrink-0 text-link" />
            {supportEmail}
          </a>
        )}
        {supportPhone && (
          <a
            href={`tel:${supportPhone}`}
            className="flex items-center gap-3 rounded-2xl border border-ink/10 bg-ink/[0.03] px-5 py-4 text-ink/80 hover:text-ink"
          >
            <Phone className="h-5 w-5 shrink-0 text-link" />
            {supportPhone}
          </a>
        )}
        {supportPhone2 && (
          <a
            href={`tel:${supportPhone2}`}
            className="flex items-center gap-3 rounded-2xl border border-ink/10 bg-ink/[0.03] px-5 py-4 text-ink/80 hover:text-ink"
          >
            <Phone className="h-5 w-5 shrink-0 text-link" />
            {supportPhone2}
          </a>
        )}
        {supportAddress && (
          <div className="flex items-start gap-3 rounded-2xl border border-ink/10 bg-ink/[0.03] px-5 py-4 text-ink/80">
            <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-link" />
            <span>{supportAddress}</span>
          </div>
        )}
      </div>

      <div className="mt-8">
        <h2 className="font-display mb-3 text-lg font-bold text-ink">Follow us</h2>
        <SocialLinks />
      </div>
    </div>
  );
}
