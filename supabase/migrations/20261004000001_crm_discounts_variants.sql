-- Phase 3: customer notes/tags, discount codes, and product variant groups.

-- ── Customer relationship management ───────────────────────────────────
alter table customer_profiles add column tags text[] not null default '{}';
create index customer_profiles_tags_idx on customer_profiles using gin (tags);

create table customer_notes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customer_profiles (id) on delete cascade,
  body text not null check (length(trim(body)) > 0),
  staff_id uuid references staff_profiles (id) on delete set null,
  staff_name text not null,
  created_at timestamptz not null default now()
);
create index customer_notes_customer_idx on customer_notes (customer_id, created_at desc);
alter table customer_notes enable row level security;

-- ── Discount codes ─────────────────────────────────────────────────────
create table discount_codes (
  id uuid primary key default gen_random_uuid(),
  -- Always stored upper-case; customers can type it in any case.
  code text not null unique check (code = upper(code) and code ~ '^[A-Z0-9_-]{3,32}$'),
  description text,
  kind text not null check (kind in ('percent', 'fixed')),
  -- percent: 1–100; fixed: kobo off the product subtotal.
  value integer not null check (value > 0),
  min_subtotal_kobo integer not null default 0 check (min_subtotal_kobo >= 0),
  -- Optional cap on a percentage discount, in kobo.
  max_discount_kobo integer check (max_discount_kobo > 0),
  starts_at timestamptz,
  ends_at timestamptz,
  usage_limit integer check (usage_limit > 0),
  per_customer_limit integer check (per_customer_limit > 0),
  is_active boolean not null default true,
  created_by uuid references staff_profiles (id) on delete set null,
  created_by_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (kind <> 'percent' or value <= 100),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);
create trigger trg_discount_codes_updated_at before update on discount_codes
  for each row execute function set_updated_at();
-- Default-deny: codes are only ever validated server-side at checkout.
alter table discount_codes enable row level security;

-- Discount applies to the product subtotal only, never delivery.
-- total_kobo stays "what the customer actually paid".
alter table orders
  add column discount_code_id uuid references discount_codes (id) on delete set null,
  add column discount_code text,
  add column discount_kobo integer not null default 0 check (discount_kobo >= 0);
create index orders_discount_code_idx on orders (discount_code_id) where discount_code_id is not null;

-- ── Variant groups ─────────────────────────────────────────────────────
-- Products that are versions of one another (e.g. the same lens in Sony E
-- and Fuji X mounts) share a variant_group_id. Each stays its own product
-- with its own price, stock and cost; the storefront just links them.
alter table products
  add column variant_group_id uuid,
  add column variant_label text;
create index products_variant_group_idx on products (variant_group_id) where variant_group_id is not null;
