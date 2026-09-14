import Link from "next/link";
import { CartLink } from "@/components/CartLink";
import { CartDrawer } from "@/components/CartDrawer";
import { AccountLink } from "@/components/AccountLink";
import { MobileCategoryMenu } from "@/components/MobileCategoryMenu";
import { DesktopNav } from "@/components/DesktopNav";

/** Dark navbar matching the approved design-system mockup (Main.dc.html):
 *  logo, search box, top-category nav links (DesktopNav, fetched
 *  client-side — see its own comment for why), login/account, and a cart
 *  icon that opens the CartDrawer (see CartLink). Deliberately NOT async /
 *  no server-side data fetch here: this renders in the root layout on
 *  every page, and a dynamic fetch at that level would force the whole
 *  app out of static rendering. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 bg-brand-900">
      <div className="mx-auto flex max-w-[1360px] items-center gap-4 px-4 py-3.5 sm:gap-7 sm:px-8">
        <div className="flex shrink-0 items-center gap-2">
          <MobileCategoryMenu />
          <Link href="/" className="flex items-center gap-2">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none" className="shrink-0">
              <g stroke="#2F6FFF" strokeWidth="1.6">
                <circle cx="16" cy="16" r="13" />
                <path d="M16 3 L16 12 M27.2 9.5 L19.4 14 M27.2 22.5 L19.4 18 M16 29 L16 20 M4.8 22.5 L12.6 18 M4.8 9.5 L12.6 14" />
                <circle cx="16" cy="16" r="3.4" fill="#2F6FFF" />
              </g>
            </svg>
            <span className="font-display text-[17px] tracking-tight text-white">
              mobile<span className="font-bold">techjoint</span>
            </span>
          </Link>
        </div>

        <form action="/search" method="GET" className="relative hidden max-w-[440px] flex-1 md:block">
          <input
            type="text"
            name="q"
            placeholder="Search cameras, mics, gimbals..."
            className="w-full rounded-full border border-white/10 bg-[#181C26] py-2.5 pl-9 pr-4 text-[13.5px] text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-brand-600"
          />
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#7A8299"
            strokeWidth="2"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
        </form>

        <DesktopNav />

        <div className="ml-auto flex shrink-0 items-center gap-4 sm:gap-5">
          <AccountLink />
          <CartLink />
        </div>
      </div>

      <CartDrawer />
    </header>
  );
}
