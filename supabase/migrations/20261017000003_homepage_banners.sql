-- Customizable homepage hero banners, managed from the staff dashboard's
-- "Customize Banner" screen. Rendered as extra slides in the homepage hero
-- carousel (same box the intro/brand slides already use — see
-- HeroCarousel.tsx), capped at 10 — enforced both here (insert trigger, so
-- the limit holds no matter what inserts it) and again in the server
-- action for a fast, friendly error before it ever reaches the database.
create table homepage_banners (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  link_url text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index homepage_banners_position_idx on homepage_banners (position);

create or replace function enforce_homepage_banner_limit() returns trigger as $$
begin
  if (select count(*) from homepage_banners) >= 10 then
    raise exception 'Maximum of 10 homepage banners reached';
  end if;
  return NEW;
end;
$$ language plpgsql;

create trigger trg_homepage_banner_limit
  before insert on homepage_banners
  for each row execute function enforce_homepage_banner_limit();

alter table homepage_banners enable row level security;
create policy "public can read homepage banners"
  on homepage_banners for select
  to anon
  using (true);

-- Public bucket for banner images, mirroring brand-media and ad-media.
insert into storage.buckets (id, name, public)
values ('banner-media', 'banner-media', true)
on conflict (id) do nothing;
