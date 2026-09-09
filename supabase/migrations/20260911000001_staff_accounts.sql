-- Staff accounts with granular, super-admin-assigned abilities — mirrors
-- the proven pattern already running at hub.makeoverarena.com
-- (staff_profiles + role + abilities jsonb), adapted to this store's
-- domains: products, inventory, customers, orders, sales, cross-sells.
--
-- Two roles only (per explicit scope): 'super_admin' (everything, always)
-- and 'staff' (only what's explicitly granted via `abilities`). Staff
-- self-register (is_pending=true, is_active=false) and need a super_admin
-- to approve them and grant abilities before they can do anything.
create table staff_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null unique,
  phone text,
  job_title text,
  role text not null default 'staff' check (role in ('super_admin', 'staff')),
  is_active boolean not null default false,
  is_pending boolean not null default true,
  -- Keys: manage_products, manage_inventory, manage_customers,
  -- manage_orders, view_sales, manage_cross_sells. Ignored entirely for
  -- role='super_admin' (always full access) — see hasAbility() in
  -- lib/staff-auth.ts.
  abilities jsonb not null default '{}',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table staff_profiles enable row level security;
-- No anon/authenticated policies — default-deny, same pattern as
-- orders/order_items. All access goes through the service client with an
-- explicit session check in application code (see lib/staff-auth.ts),
-- consistent with how /admin and /account already work in this project.
