import { redirect } from "next/navigation";
import { getStaffSession, logoutStaff } from "@/app/actions/staff-auth";
import { hasAbility } from "@/lib/staff-auth";
import { StaffDashboardNav } from "@/components/staff/StaffDashboardNav";

const NAV = [
  { href: "/staff/dashboard", label: "Overview", ability: null },
  { href: "/staff/dashboard/products", label: "Products", ability: "manage_products" as const },
  { href: "/staff/dashboard/inventory", label: "Inventory", ability: "manage_inventory" as const },
  { href: "/staff/dashboard/customers", label: "Customers", ability: "manage_customers" as const },
  { href: "/staff/dashboard/orders", label: "Orders", ability: "manage_orders" as const },
  { href: "/staff/dashboard/deliveries", label: "Deliveries", ability: "manage_deliveries" as const },
  { href: "/staff/dashboard/sales", label: "Sales & Income", ability: "view_sales" as const },
  { href: "/staff/dashboard/expenses", label: "Expenses", ability: "manage_expenses" as const },
  { href: "/staff/dashboard/cross-sells", label: "Cross-sells", ability: "manage_cross_sells" as const },
];

export default async function StaffDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getStaffSession();
  if (!session) redirect("/staff/login");

  if (session.isPending) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <h1 className="font-display mb-2 text-xl text-brand-900">Awaiting approval</h1>
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
  if (session.role === "super_admin") {
    visibleNav.push({ href: "/staff/dashboard/team", label: "Team", ability: null });
  }

  const initials = session.fullName
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      <aside className="w-[230px] shrink-0 bg-[#0F1219] py-5">
        <div className="mb-3.5 flex items-center gap-2 px-5">
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
            <g stroke="#2F6FFF" strokeWidth="1.6">
              <circle cx="16" cy="16" r="13" />
              <path d="M16 3 L16 12 M27.2 9.5 L19.4 14 M27.2 22.5 L19.4 18 M16 29 L16 20 M4.8 22.5 L12.6 18 M4.8 9.5 L12.6 14" />
              <circle cx="16" cy="16" r="3.2" fill="#2F6FFF" />
            </g>
          </svg>
          <span className="text-[15px] text-white">
            mobile<span className="font-bold">techjoint</span>
          </span>
        </div>
        <div className="mb-2 px-5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#5A6178]">
          Staff Dashboard
        </div>

        <nav className="flex flex-col">
          <StaffDashboardNav items={visibleNav} />
        </nav>

        <div className="mt-7 border-t border-[#1E2230] px-5 pt-3.5">
          <div className="mb-3 flex items-center gap-2.5">
            <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-brand-500 text-[11px] font-bold text-white">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[12.5px] font-semibold text-white">
                {session.fullName}
              </p>
              <p className="text-[10.5px] text-[#5A6178]">
                {session.role === "super_admin" ? "Super Admin" : "Staff"}
              </p>
            </div>
          </div>
          <form action={logoutStaff}>
            <button
              type="submit"
              className="text-[12.5px] font-semibold text-[#8A91A5] hover:text-white"
            >
              Log out
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0 flex-1 bg-surface px-8 py-6.5">{children}</div>
    </div>
  );
}
