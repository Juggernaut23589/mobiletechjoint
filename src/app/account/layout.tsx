import Link from "next/link";
import { signOut } from "@/app/actions/account";

const NAV = [
  { href: "/account", label: "Overview" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/payment-methods", label: "Payment Methods" },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-col gap-8 md:flex-row">
        <nav className="flex gap-2 overflow-x-auto md:w-48 md:shrink-0 md:flex-col md:overflow-visible">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-md px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-brand-50 hover:text-brand-700"
            >
              {item.label}
            </Link>
          ))}
          <form action={signOut} className="shrink-0 md:mt-4">
            <button
              type="submit"
              className="w-full rounded-md px-3 py-2 text-left text-sm text-neutral-400 hover:text-red-600"
            >
              Log out
            </button>
          </form>
        </nav>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
