import Link from "next/link";
import { redirect } from "next/navigation";
import { getStaffSession, logoutStaff } from "@/app/actions/staff-auth";
import { hasAbility } from "@/lib/staff-auth";

const NAV = [
  { href: "/staff/dashboard", label: "Overview", ability: null },
  { href: "/staff/dashboard/products", label: "Products", ability: "manage_products" as const },
  { href: "/staff/dashboard/inventory", label: "Inventory", ability: "manage_inventory" as const },
  { href: "/staff/dashboard/customers", label: "Customers", ability: "manage_customers" as const },
  { href: "/staff/dashboard/orders", label: "Orders", ability: "manage_orders" as const },
  { href: "/staff/dashboard/sales", label: "Sales & Income", ability: "view_sales" as const },
  { href: "/staff/dashboard/cross-sells", label: "Cross-sells", ability: "manage_cross_sells" as const },
];

export default async function StaffDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getStaffSession();
  if (!session) redirect("/staff/login");

  if (session.isPending) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <h1 className="mb-2 text-xl font-bold text-brand-900">Awaiting approval</h1>
        <p className="mb-6 text-sm text-neutral-500">
          Hi {session.fullName.split(" ")[0]} — your staff account has been created but a super
          admin still needs to approve it and grant you access before you can use the dashboard.
        </p>
        <form action={logoutStaff}>
          <button type="submit" className="text-sm text-neutral-400 hover:text-neutral-900">
            Log out
          </button>
        </form>
      </div>
    );
  }

  const visibleNav = NAV.filter(
    (item) => !item.ability || session.role === "super_admin" || hasAbility(session, item.ability)
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-col gap-8 md:flex-row">
        <nav className="flex gap-2 overflow-x-auto md:w-52 md:shrink-0 md:flex-col md:overflow-visible">
          <div className="mb-2 hidden md:block">
            <p className="text-sm font-semibold text-brand-900">{session.fullName}</p>
            <p className="text-xs text-neutral-500">
              {session.role === "super_admin" ? "Super Admin" : "Staff"}
            </p>
          </div>
          {visibleNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-md px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-brand-50 hover:text-brand-700"
            >
              {item.label}
            </Link>
          ))}
          {session.role === "super_admin" && (
            <Link
              href="/staff/dashboard/team"
              className="shrink-0 rounded-md px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-brand-50 hover:text-brand-700"
            >
              Team
            </Link>
          )}
          <form action={logoutStaff} className="shrink-0 md:mt-4">
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
