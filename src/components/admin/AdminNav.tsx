import Link from "next/link";
import { adminLogout } from "@/app/actions/admin-auth";

export function AdminNav({ active }: { active: "products" | "cross-sells" }) {
  return (
    <div className="mb-6 flex items-center justify-between border-b border-neutral-200 pb-4">
      <nav className="flex gap-4">
        <Link
          href="/admin/products"
          className={`text-sm font-medium ${active === "products" ? "text-brand-700" : "text-neutral-500 hover:text-neutral-900"}`}
        >
          Products
        </Link>
        <Link
          href="/admin/cross-sells"
          className={`text-sm font-medium ${active === "cross-sells" ? "text-brand-700" : "text-neutral-500 hover:text-neutral-900"}`}
        >
          Cross-sells
        </Link>
      </nav>
      <form action={adminLogout}>
        <button type="submit" className="text-sm text-neutral-400 hover:text-neutral-900">
          Log out
        </button>
      </form>
    </div>
  );
}
