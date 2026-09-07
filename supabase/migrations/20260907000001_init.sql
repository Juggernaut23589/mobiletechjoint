-- MobileTechJoint — initial schema
-- Scope: storefront + Paystack checkout + Instagram-catalogue sync (v1)
--
-- Design notes:
--   * All money stored as integer KOBO (1 NGN = 100 kobo). Never floats —
--     this is what Paystack's API itself expects, and avoids rounding bugs.
--   * Products created by the Instagram poller land as status='draft' with
--     price_kobo = NULL. A human must set a price and flip to 'published'.
--     This is the safeguard discussed in the proposal: an Instagram post has
--     no price/stock data, so nothing from that pipeline can go live untouched.
--   * orders.paystack_reference is unique and is the idempotency key for the
--     webhook handler — Paystack retries webhook delivery, so the handler
--     must be safe to run twice for the same reference.
--   * order_items snapshots product name/price at purchase time, so a later
--     price change or product edit never rewrites historical orders.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
create table categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  created_at  timestamptz not null default now()
);

comment on table categories is 'Consolidated product categories — replaces the 29 overlapping categories found in the WooCommerce audit.';

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------
create type product_status as enum ('draft', 'published', 'archived');
create type product_source as enum ('manual', 'woocommerce_import', 'instagram');

create table products (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  slug                text not null unique,
  description         text,
  price_kobo          integer,                    -- nullable: Instagram drafts have no price yet
  currency            text not null default 'NGN',
  category_id         uuid references categories(id) on delete set null,
  stock_quantity      integer not null default 0,
  status              product_status not null default 'draft',
  source              product_source not null default 'manual',

  -- Instagram provenance (null for manual/imported products)
  instagram_media_id  text unique,

  -- WooCommerce provenance, kept for traceability during/after migration
  woocommerce_id       integer unique,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint price_required_when_published
    check (status <> 'published' or price_kobo is not null)
);

comment on table products is 'Core catalogue. Instagram-sourced rows start as draft with no price; a human must price and publish them.';
comment on column products.price_kobo is 'Price in kobo (NGN cents). E.g. 25000.00 NGN = 2500000 kobo.';
comment on constraint price_required_when_published on products is
  'Enforces at the data layer, not just in the UI, that nothing can go live without a human-set price.';

create index idx_products_status on products(status);
create index idx_products_category on products(category_id);
create index idx_products_source on products(source);

-- ---------------------------------------------------------------------------
-- product_images  (also used for the Instagram video attached to a post)
-- ---------------------------------------------------------------------------
create table product_images (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references products(id) on delete cascade,
  url         text not null,          -- always a URL into Supabase Storage; never a raw Instagram CDN URL, which expires
  is_video    boolean not null default false,
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);

comment on table product_images is 'Media re-hosted into Supabase Storage. Instagram CDN URLs are signed/temporary, so nothing here ever points directly at instagram.com or cdninstagram.com.';

create index idx_product_images_product on product_images(product_id, position);

-- ---------------------------------------------------------------------------
-- instagram_import_log
-- ---------------------------------------------------------------------------
-- The dedup + audit trail for the 3-hourly poller. Every post the poller
-- sees gets a row here BEFORE a product is created, keyed on Instagram's own
-- media id, so re-running the poll (or a retry) can never double-import.
create type import_status as enum ('pending_review', 'imported', 'skipped', 'failed');

create table instagram_import_log (
  id                  uuid primary key default gen_random_uuid(),
  instagram_media_id  text not null unique,
  raw_caption         text,
  media_urls          jsonb not null default '[]'::jsonb,   -- the original (temporary) Instagram URLs, kept for debugging only
  status              import_status not null default 'pending_review',
  product_id          uuid references products(id) on delete set null,
  failure_reason      text,
  polled_at           timestamptz not null default now(),
  processed_at        timestamptz
);

comment on table instagram_import_log is 'One row per Instagram media item ever seen by the poller. instagram_media_id UNIQUE is the dedup key.';

create index idx_ig_import_status on instagram_import_log(status);

-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------
create type order_status as enum ('pending', 'paid', 'failed', 'refunded');

create table orders (
  id                  uuid primary key default gen_random_uuid(),
  customer_name       text not null,
  customer_email      text not null,
  customer_phone      text,
  status              order_status not null default 'pending',
  total_kobo          integer not null,
  currency            text not null default 'NGN',

  -- Paystack linkage. reference is generated by us at checkout-init time and
  -- is the idempotency key the webhook handler keys off of.
  paystack_reference  text not null unique,
  paystack_verified_at timestamptz,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table orders is 'paystack_reference is unique and is the webhook idempotency key — Paystack retries delivery, so processing the same reference twice must be a no-op.';

create index idx_orders_status on orders(status);
create index idx_orders_paystack_ref on orders(paystack_reference);

-- ---------------------------------------------------------------------------
-- order_items
-- ---------------------------------------------------------------------------
create table order_items (
  id                uuid primary key default gen_random_uuid(),
  order_id          uuid not null references orders(id) on delete cascade,
  product_id        uuid references products(id) on delete set null,

  -- Snapshotted at purchase time — a later product-name or price edit must
  -- never alter what a historical order says the customer paid for.
  product_name_snapshot   text not null,
  unit_price_kobo_snapshot integer not null,
  quantity                integer not null check (quantity > 0),

  created_at        timestamptz not null default now()
);

comment on column order_items.product_name_snapshot is 'Copied from products.name at purchase time — historical orders must not change if the product is later renamed.';
comment on column order_items.unit_price_kobo_snapshot is 'Copied from products.price_kobo at purchase time — protects historical orders from later price edits.';

create index idx_order_items_order on order_items(order_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_products_updated_at
  before update on products
  for each row execute function set_updated_at();

create trigger trg_orders_updated_at
  before update on orders
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
-- Public storefront reads published products only, via the anon key.
-- Everything else (orders, drafts, the import log) is server-only, via the
-- service-role key from API routes / webhook handlers — RLS denies anon
-- access by default once enabled, so no policy = no public access.

alter table categories enable row level security;
alter table products enable row level security;
alter table product_images enable row level security;
alter table instagram_import_log enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;

create policy "public can read categories"
  on categories for select
  to anon
  using (true);

create policy "public can read published products"
  on products for select
  to anon
  using (status = 'published');

create policy "public can read images of published products"
  on product_images for select
  to anon
  using (
    exists (
      select 1 from products
      where products.id = product_images.product_id
      and products.status = 'published'
    )
  );

-- No anon policies on instagram_import_log, orders, or order_items:
-- draft products, order data, and import provenance are never public.
