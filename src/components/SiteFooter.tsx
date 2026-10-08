import Link from "next/link";
import { Mail, Phone, AtSign, MapPin, ShieldCheck } from "lucide-react";
import { FooterCategoryLinks } from "@/components/FooterCategoryLinks";
import { Logo } from "@/components/Logo";
import { VisaMark, MastercardMark, PaystackMark } from "@/components/PaymentLogos";

/** Dark footer matching the approved design-system mockup (Main.dc.html):
 *  brand blurb, real category links, payment trust badges, and contact —
 *  contact rows only render when the corresponding env var is set, never
 *  fabricated placeholder details (same pattern as lib/paystack.ts). "Returns"/"FAQ" links from the mockup are omitted —
 *  no such pages existed at the time; "Meet the team" / "FAQ" were added
 *  once /team and the homepage FAQ section shipped. */
export function SiteFooter() {
  const supportEmail = process.env.SUPPORT_EMAIL;
  const supportPhone = process.env.SUPPORT_PHONE;
  const supportPhone2 = process.env.SUPPORT_PHONE_2;
  const instagramUrl = process.env.INSTAGRAM_URL;
  const supportAddress = process.env.SUPPORT_ADDRESS;

  const hasContact = supportEmail || supportPhone || supportPhone2 || instagramUrl || supportAddress;

  return (
    <footer className="bg-[#080A0F] px-4 pb-7 pt-14 text-[#8A91A5] sm:px-8">
      <div className="mx-auto grid max-w-[1360px] gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="mb-3.5 flex items-center gap-2">
            <Logo size={28} />
            <span className="text-base text-white">
              mobile<span className="font-bold">techjoint</span>
            </span>
          </div>
          <p className="max-w-[280px] text-[13px] leading-relaxed">
            Cameras, lighting, tripods, and audio gear for content creators and media teams
            in Nigeria.
          </p>
        </div>

        <div>
          <h4 className="mb-3.5 text-[13.5px] font-semibold text-white">Shop</h4>
          <FooterCategoryLinks />
        </div>

        <div>
          <h4 className="mb-3.5 text-[13.5px] font-semibold text-white">Company</h4>
          <ul className="mb-6 flex flex-col gap-2.5 text-sm">
            <li>
              <Link href="/team" className="hover:text-white">
                Meet the team
              </Link>
            </li>
            <li>
              <Link href="/#faq" className="hover:text-white">
                FAQ
              </Link>
            </li>
            <li>
              <Link href="/deals" className="hover:text-white">
                Deals
              </Link>
            </li>
            <li>
              <Link href="/returns-refunds" className="hover:text-white">
                Returns &amp; Refunds
              </Link>
            </li>
            <li>
              <Link href="/privacy-policy" className="hover:text-white">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/terms-of-service" className="hover:text-white">
                Terms of Service
              </Link>
            </li>
          </ul>
          <h4 className="mb-3.5 text-[13.5px] font-semibold text-white">Payment</h4>
          <div className="flex items-start gap-2 text-sm">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent-500" />
            Secure checkout via Paystack — cards, bank transfer &amp; USSD
          </div>
        </div>

        {hasContact && (
          <div>
            <h4 className="mb-3.5 text-[13.5px] font-semibold text-white">Get in touch</h4>
            <div className="flex flex-col gap-2.5 text-sm">
              {supportEmail && (
                <a href={`mailto:${supportEmail}`} className="flex items-center gap-2 hover:text-white">
                  <Mail className="h-4 w-4 shrink-0" />
                  {supportEmail}
                </a>
              )}
              {supportPhone && (
                <a href={`tel:${supportPhone}`} className="flex items-center gap-2 hover:text-white">
                  <Phone className="h-4 w-4 shrink-0" />
                  {supportPhone}
                </a>
              )}
              {supportPhone2 && (
                <a href={`tel:${supportPhone2}`} className="flex items-center gap-2 hover:text-white">
                  <Phone className="h-4 w-4 shrink-0" />
                  {supportPhone2}
                </a>
              )}
              {instagramUrl && (
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-white"
                >
                  <AtSign className="h-4 w-4 shrink-0" />
                  Follow on Instagram
                </a>
              )}
              {supportAddress && (
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{supportAddress}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mx-auto mt-9 flex max-w-[1360px] flex-wrap items-center justify-between gap-4 border-t border-[#1C2029] pt-6">
        <p className="text-xs">© {new Date().getFullYear()} mobiletechjoint. All rights reserved.</p>
        <div className="flex items-center gap-2.5">
          <VisaMark />
          <MastercardMark />
          <PaystackMark />
        </div>
      </div>
    </footer>
  );
}
