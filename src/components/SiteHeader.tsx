import Link from "next/link";
import { CartLink } from "@/components/CartLink";

export function SiteHeader() {
  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-lg font-bold tracking-tight text-neutral-900">
          MobileTechJoint
        </Link>
        <CartLink />
      </div>
    </header>
  );
}
