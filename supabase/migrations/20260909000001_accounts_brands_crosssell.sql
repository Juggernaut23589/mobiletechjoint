-- Customer accounts, saved payment methods, brand browsing, and curated
-- cross-sell category pairs. Auth itself is Supabase Auth (auth.users) —
-- this migration only adds the app-side tables that hang off a logged-in
-- customer, plus brand/complement data for the catalogue.

-- One row per customer, keyed to auth.users. Created by the signup Server
-- Action (not a DB trigger) to keep auth-schema permissions out of this
-- migration.
create table customer_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  created_at timestamptz not null default now()
);

alter table customer_profiles enable row level security;

-- Orders can now optionally belong to a logged-in customer. Guest checkout
-- (customer_id null) keeps working exactly as before — this is additive.
alter table orders
  add column customer_id uuid references auth.users (id) on delete set null,
  add column save_card_requested boolean not null default false;

create index orders_customer_id_idx on orders (customer_id);

-- Saved payment methods store ONLY what Paystack gives back after a
-- successful charge — a reusable authorization_code plus display metadata.
-- Never raw card numbers; this app is never in PCI scope because of that.
create table saved_payment_methods (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users (id) on delete cascade,
  paystack_authorization_code text not null,
  card_type text,
  last4 text,
  exp_month text,
  exp_year text,
  bank text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique (customer_id, paystack_authorization_code)
);

alter table saved_payment_methods enable row level security;
create index saved_payment_methods_customer_id_idx on saved_payment_methods (customer_id);

-- Brands: a manufacturer facet within a category (Cameras -> Sony -> models),
-- not a replacement for categories.
create table brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now()
);

alter table brands enable row level security;
create policy brands_select_all on brands for select using (true);

alter table products
  add column brand_id uuid references brands (id) on delete set null;

create index products_brand_id_idx on products (brand_id);

-- Curated "this category pairs with that category" mapping, since there's
-- no order history yet to derive real complementary-purchase data from.
-- Directional: a row (cameras -> lenses) does not imply (lenses -> cameras)
-- unless a second row is added, since accessory categories rarely want the
-- parent product cross-sold back to them.
create table category_complements (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories (id) on delete cascade,
  complement_category_id uuid not null references categories (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (category_id, complement_category_id),
  check (category_id != complement_category_id)
);

alter table category_complements enable row level security;
create policy category_complements_select_all on category_complements for select using (true);
