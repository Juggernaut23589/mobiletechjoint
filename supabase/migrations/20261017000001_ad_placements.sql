-- Admin-managed picture ads, shown either near the homepage footer or
-- beside the video on a brand's product pages. Managed from the staff
-- dashboard's "Edit Ad Placements" screen.
create table ad_placements (
  id uuid primary key default gen_random_uuid(),
  placement text not null check (placement in ('homepage', 'brand')),
  brand_id uuid references brands (id) on delete cascade,
  image_url text not null,
  caption text,
  -- Optional click-through — a product, category, brand, or external URL.
  link_url text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  check ((placement = 'brand') = (brand_id is not null))
);

create index ad_placements_lookup_idx on ad_placements (placement, brand_id, position);

alter table ad_placements enable row level security;
create policy "public can read ad placements"
  on ad_placements for select
  to anon
  using (true);

-- Public bucket for ad photos, mirroring the existing "product-media",
-- "team-media", and "brand-media" buckets.
insert into storage.buckets (id, name, public)
values ('ad-media', 'ad-media', true)
on conflict (id) do nothing;
