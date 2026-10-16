-- Customizable picture banners shown at the top and bottom of each brand
-- page, managed from the staff dashboard's "Customize Brand Assets" screen.
-- Purely decorative product-photo boxes — no link_url, unlike the navbar
-- categories mega-menu's brand thumbnails, which do need to link out.
create table brand_banner_images (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands (id) on delete cascade,
  placement text not null check (placement in ('top', 'bottom')),
  image_url text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index brand_banner_images_brand_idx on brand_banner_images (brand_id, placement, position);

alter table brand_banner_images enable row level security;
create policy "public can read brand banner images"
  on brand_banner_images for select
  to anon
  using (true);

-- Public bucket for brand banner photos, mirroring the existing
-- "product-media" and "team-media" buckets.
insert into storage.buckets (id, name, public)
values ('brand-media', 'brand-media', true)
on conflict (id) do nothing;
