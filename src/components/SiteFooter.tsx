import Link from "next/link";
import { Mail, Phone, AtSign, ShieldCheck } from "lucide-react";

/** Contact/social rows only render when the corresponding env var is set —
 *  never fabricated placeholder details. Same fail-gracefully pattern as
 *  lib/paystack.ts and lib/instagram.ts: missing config means "don't show
 *  it," not "make something up." Fill these in .env.local /
 *  Vercel env vars once real details exist. */
export function SiteFooter() {
  const supportEmail = process.env.SUPPORT_EMAIL;
  const supportPhone = process.env.SUPPORT_PHONE;
  const instagramUrl = process.env.INSTAGRAM_URL;

  const hasContact = supportEmail || supportPhone || instagramUrl;

  return (
    <footer className="mt-16 border-t border-neutral-200 bg-brand-900 text-white">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <h3 className="font-display mb-2 text-lg font-bold">
              MobileTech<span className="text-accent-gradient">Joint</span>
            </h3>
            <p className="text-sm text-white/70">
              Cameras, lighting, tripods, and audio gear for content creators and media
              teams in Nigeria.
            </p>
          </div>

          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/50">
              Payment
            </h4>
            <div className="flex items-center gap-2 text-sm text-white/70">
              <ShieldCheck className="h-4 w-4 shrink-0 text-accent-400" />
              Secure checkout via Paystack — cards, bank transfer & USSD
            </div>
          </div>

          {hasContact && (
            <div>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/50">
                Get in touch
              </h4>
              <div className="flex flex-col gap-2 text-sm text-white/70">
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
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 border-t border-white/10 pt-6 text-xs text-white/50">
          <p>
            © {new Date().getFullYear()} MobileTechJoint. All rights reserved.{" "}
            <Link href="/" className="hover:text-white">
              mobiletechjoint.com
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
