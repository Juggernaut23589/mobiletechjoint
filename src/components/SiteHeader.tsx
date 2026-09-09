import Link from "next/link";
import { CartLink } from "@/components/CartLink";
import { AccountLink } from "@/components/AccountLink";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-brand-900/10 bg-brand-900">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4">
        <Link href="/" className="shrink-0 text-lg font-extrabold tracking-tight text-white">
          MobileTech<span className="text-accent-400">Joint</span>
        </Link>
        <div className="flex items-center gap-4 sm:gap-6">
          <AccountLink />
          <CartLink />
        </div>
      </div>
    </header>
  );
}
