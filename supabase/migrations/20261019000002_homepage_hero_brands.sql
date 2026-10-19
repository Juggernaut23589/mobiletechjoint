-- The homepage hero carousel's "brand showcase" slides (product-collage
-- slides, see getHeroBrandShowcase in lib/products.ts) were driven by a
-- hardcoded HERO_BRAND_ORDER array in brand-editorial.ts — invisible and
-- unremovable from the admin dashboard. Moving that into a real table so
-- it shows up in "Customize Banner" and can be added to / removed from
-- like every other homepage section. Seeded below with the brands
-- HERO_BRAND_ORDER currently lists, in the same order, so nothing changes
-- visually until an admin actually edits it.
create table homepage_hero_brands (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands (id) on delete cascade unique,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index homepage_hero_brands_position_idx on homepage_hero_brands (position);

create or replace function enforce_homepage_hero_brand_limit() returns trigger as $$
begin
  if (select count(*) from homepage_hero_brands) >= 10 then
    raise exception 'Maximum of 10 homepage hero brand slides reached';
  end if;
  return NEW;
end;
$$ language plpgsql;

create trigger trg_homepage_hero_brand_limit
  before insert on homepage_hero_brands
  for each row execute function enforce_homepage_hero_brand_limit();

alter table homepage_hero_brands enable row level security;
create policy "public can read homepage hero brands"
  on homepage_hero_brands for select
  to anon
  using (true);

insert into homepage_hero_brands (brand_id, position)
select b.id, x.ord
from (values
  ('sony', 0), ('godox', 1), ('dji', 2), ('canon', 3), ('ulanzi', 4),
  ('lexar', 5), ('kandf-concept', 6), ('fujifilm', 7), ('hollyland', 8)
) as x(slug, ord)
join brands b on b.slug = x.slug
on conflict (brand_id) do nothing;
