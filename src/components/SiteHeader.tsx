import Link from "next/link";
import { CartLink } from "@/components/CartLink";
import { CartDrawer } from "@/components/CartDrawer";
import { AccountLink } from "@/components/AccountLink";
import { MobileCategoryMenu } from "@/components/MobileCategoryMenu";
import { DesktopNav } from "@/components/DesktopNav";
import { Logo } from "@/components/Logo";
import { SearchBar } from "@/components/SearchBar";

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
      <div className="mx-auto flex max-w-[1360px] items-center gap-4 px-4 py-2.5 sm:gap-7 sm:px-8">
        <div className="flex shrink-0 items-center gap-2">
          <MobileCategoryMenu />
          <Link href="/" className="flex items-center gap-2">
            <Logo size={56} />
            <span className="font-display text-[17px] tracking-tight text-white">
              mobile<span className="font-bold">techjoint</span>
            </span>
          </Link>
        </div>

        <SearchBar className="hidden max-w-[440px] flex-1 md:block" />

        <DesktopNav />

        <div className="ml-auto flex shrink-0 items-center gap-4 sm:gap-5">
          <AccountLink />
          <CartLink />
        </div>
      </div>

      {/* Mobile-only search row. The row above hides its search form below
       *  md (no room next to the hamburger/logo/cart), so without this
       *  there was no way at all to search on a phone — confirmed missing
       *  in a full front-end audit. Full-width, always visible, never
       *  behind a toggle. */}
      <div className="block px-4 pb-2.5 md:hidden">
        <label htmlFor="mtj-mobile-search" className="sr-only">
          Search products
        </label>
        <SearchBar id="mtj-mobile-search" />
      </div>

      <CartDrawer />
    </header>
  );
}
