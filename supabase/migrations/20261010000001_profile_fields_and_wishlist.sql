-- Extends customer profiles with the fields customers can now edit
-- themselves, and adds a wishlist. No RLS policies on either — same
-- established pattern as orders/customer_profiles already use: every
-- access path goes through a service-role server action that explicitly
-- filters by the logged-in customer's own id in application code, rather
-- than relying on RLS.
alter table customer_profiles
  add column age smallint,
  add column gender text,
  add column address text;

alter table customer_profiles
  add constraint customer_profiles_age_range check (age is null or (age between 13 and 120));

create table wishlist_items (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (customer_id, product_id)
);

create index wishlist_items_customer_id_idx on wishlist_items (customer_id);
create index wishlist_items_product_id_idx on wishlist_items (product_id);
