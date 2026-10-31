import type { Metadata } from "next";
import Link from "next/link";
import { Mail, Phone, MapPin } from "lucide-react";
import { SocialLinks, WhatsAppLink } from "@/components/SocialLinks";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with MobileTechJoint.",
};

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
      <div className="mb-5 text-[13px] text-white/50">
        <Link href="/" className="text-accent-400 hover:text-white">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-white">Contact Us</span>
      </div>
      <h1 className="font-display mb-2 text-3xl font-bold tracking-tight text-white">
        Contact Us
      </h1>
      <p className="mb-10 max-w-xl text-[15px] leading-relaxed text-white/70">
        Questions about an order, a product, or anything else — we&apos;re happy to help.
      </p>

      <div className="flex flex-col gap-3 text-[15px]">
        <WhatsAppLink className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-white/80" />
        {supportEmail && (
          <a
            href={`mailto:${supportEmail}`}
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-white/80 hover:text-white"
          >
            <Mail className="h-5 w-5 shrink-0 text-accent-400" />
            {supportEmail}
          </a>
        )}
        {supportPhone && (
          <a
            href={`tel:${supportPhone}`}
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-white/80 hover:text-white"
          >
            <Phone className="h-5 w-5 shrink-0 text-accent-400" />
            {supportPhone}
          </a>
        )}
        {supportPhone2 && (
          <a
            href={`tel:${supportPhone2}`}
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-white/80 hover:text-white"
          >
            <Phone className="h-5 w-5 shrink-0 text-accent-400" />
            {supportPhone2}
          </a>
        )}
        {supportAddress && (
          <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-white/80">
            <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-accent-400" />
            <span>{supportAddress}</span>
          </div>
        )}
      </div>

      <div className="mt-8">
        <h2 className="font-display mb-3 text-lg font-bold text-white">Follow us</h2>
        <SocialLinks />
      </div>
    </div>
  );
}
