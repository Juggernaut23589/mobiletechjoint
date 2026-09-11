import Link from "next/link";
import { CartLink } from "@/components/CartLink";
import { AccountLink } from "@/components/AccountLink";
import { MobileCategoryMenu } from "@/components/MobileCategoryMenu";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-brand-900/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4">
        <div className="flex items-center gap-3">
          <MobileCategoryMenu />
          <Link
            href="/"
            className="shrink-0 font-display text-lg font-bold tracking-tight text-white transition-opacity hover:opacity-90"
          >
            MobileTech<span className="text-accent-gradient">Joint</span>
          </Link>
        </div>
        <div className="flex items-center gap-4 sm:gap-6">
          <AccountLink />
          <CartLink />
        </div>
      </div>
    </header>
  );
}
