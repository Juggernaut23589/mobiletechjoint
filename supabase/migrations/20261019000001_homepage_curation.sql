-- Admin-curated "Deals" section, same shape as is_featured/is_trending/
-- is_new_arrival — getDealsProducts() in lib/products.ts prefers these
-- picks when any exist, falling back to the existing compare-at-price
-- behavior otherwise.
alter table products add column is_deal boolean not null default false;

create index products_is_deal_idx on products (is_deal) where is_deal = true;

-- Admin-curated "Shop by brand" homepage shelves. getBrandShelves() in
-- lib/products.ts uses these brands, in position order, when any are
-- picked — falling back to the existing top-brands-by-stock logic
-- otherwise. Capped at 6, same enforced-both-places pattern as
-- homepage_banners (20261017000003).
create table homepage_brand_shelves (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands (id) on delete cascade unique,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index homepage_brand_shelves_position_idx on homepage_brand_shelves (position);

create or replace function enforce_homepage_brand_shelf_limit() returns trigger as $$
begin
  if (select count(*) from homepage_brand_shelves) >= 6 then
    raise exception 'Maximum of 6 homepage brand shelves reached';
  end if;
  return NEW;
end;
$$ language plpgsql;

create trigger trg_homepage_brand_shelf_limit
  before insert on homepage_brand_shelves
  for each row execute function enforce_homepage_brand_shelf_limit();

alter table homepage_brand_shelves enable row level security;
create policy "public can read homepage brand shelves"
  on homepage_brand_shelves for select
  to anon
  using (true);
