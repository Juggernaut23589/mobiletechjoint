-- Public "Meet the team" profiles, managed from the staff dashboard
-- ("Manage team blog") instead of being hard-coded in the codebase.
-- Separate from staff_profiles: these are public-facing profiles, and not
-- every person shown needs a dashboard login (or vice versa).
create table team_members (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (length(trim(name)) > 0),
  role text not null,
  -- One line under the name on cards.
  tagline text not null default '',
  -- Pull-quote on the profile page.
  quote text not null default '',
  -- Profile write-up; paragraphs separated by blank lines.
  bio text not null default '',
  -- /team/... (bundled originals) or a Supabase Storage public URL.
  photo_url text,
  -- "Shop what {name} picks" links: [{ "label": "...", "href": "/..." }]
  curates jsonb not null default '[]',
  position integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index team_members_position_idx on team_members (position);
create trigger trg_team_members_updated_at before update on team_members
  for each row execute function set_updated_at();

alter table team_members enable row level security;
create policy "public can read published team members"
  on team_members for select
  to anon
  using (is_published);

-- The six profiles that were previously hard-coded in src/lib/team.ts.
insert into team_members (slug, name, role, tagline, quote, bio, photo_url, curates, position) values
  ('tunde-bakare', 'Tunde Bakare', 'Managing Director', 'Sets the bar for what earns a place on our shelves.', 'If a product wouldn''t survive a wedding shoot in Surulere, it doesn''t get stocked.', 'Tunde founded MobileTechJoint after fifteen years running production for Lagos media houses, where he learned the hard way that cheap gear costs the most. A dead battery in the middle of a client shoot, a card that corrupts on the drive home, a light stand that folds in the wind — he has lived every one of those stories, and the store exists so that our customers never have to.

As Managing Director he approves every brand relationship personally. That means going to the manufacturer or authorised distributor directly, never a grey-market middleman, so what arrives at your door is exactly what the box says it is, with a warranty that actually holds.

Tunde''s rule for the buying team is simple: we only stock what we would put on our own rigs. It is why our catalogue is smaller than the big marketplaces and why almost nothing on it disappoints.', '/team/tunde-bakare.jpg', '[{"label":"Deals","href":"/deals"},{"label":"Sony","href":"/brand/sony"},{"label":"Canon","href":"/brand/canon"}]'::jsonb, 0),
  ('adaeze-okonkwo', 'Adaeze Okonkwo', 'Creative Director', 'Shapes the look of every shoot, and every shelf.', 'Great gear disappears. You should only ever notice the image.', 'Adaeze spent a decade art-directing campaigns for fashion and beauty brands across Lagos and Accra before joining MobileTechJoint. She knows what a frame needs before the camera is even out of the bag, and she brings that eye to how we choose what to sell.

Every product category on the site passes across her desk. She looks past spec sheets to the questions that matter on set: does this light render skin honestly, does this modifier shape rather than flatten, will this camera''s colour hold up in a mixed-light room without an hour of grading afterwards.

Her curation is the reason our lighting and camera shelves feel edited rather than exhaustive. If Adaeze has kept something in the range, it is because she has used it to make something beautiful.', '/team/adaeze-okonkwo.jpg', '[{"label":"Lighting","href":"/category/lighting"},{"label":"Godox","href":"/brand/godox"},{"label":"Fujifilm","href":"/brand/fujifilm"}]'::jsonb, 1),
  ('chidinma-eze', 'Chidinma Eze', 'Content Creator', 'Tests everything the way you''d actually use it.', 'I shoot with our stock every single day. If it slows me down, it''s gone.', 'Chidinma runs the MobileTechJoint content studio and a creator channel of her own, which means she is the first person in the building to unbox, rig up and shoot with anything new we bring in. Vlogging kits, phone cages, mini tripods, gimbals — if it is built for creators, she has put it through a real week of filming before it goes live on the site.

Her feedback is brutally practical. A cold-shoe mount that loosens after ten minutes, an RGB light whose app drops connection, a gimbal that needs recalibrating every time you swap lenses — those are the products that quietly never make it to our shelves.

When you see a creator kit or an Ulanzi accessory in our store, it is because Chidinma has already used it to make videos people watched. She curates for speed, reliability and the small conveniences that add up over a long shoot day.', '/team/chidinma-eze.jpg', '[{"label":"Ulanzi","href":"/brand/ulanzi"},{"label":"DJI","href":"/brand/dji"},{"label":"Mounts","href":"/category/tripods-and-mounts"}]'::jsonb, 2),
  ('emeka-nwosu', 'Emeka Nwosu', 'Sound Expert', 'Because audio is half the picture.', 'Viewers forgive soft focus. They never forgive bad sound.', 'Emeka trained as a live sound engineer and spent years mixing for stage and broadcast before turning his ear to production audio. He is the reason our microphone and wireless range is short, considered and free of the noisy, drop-prone options that flood the market.

Every wireless system we stock has been tested by Emeka in the environments our customers actually work in: a windy beach at Elegushi, a conference hall full of interference, a small room that rings. He listens for the things spec sheets hide — noise floor, latency, how gracefully a system handles a dropout.

He also helps customers match gear to their situation, whether that is a two-person podcast, a wedding videographer who needs a reliable lav, or a solo creator recording in a bedroom. Buy audio from us and you are buying his judgement.', '/team/emeka-nwosu.jpg', '[{"label":"Audio","href":"/category/microphones-and-audio"},{"label":"Hollyland","href":"/brand/hollyland"},{"label":"DJI","href":"/brand/dji"}]'::jsonb, 3),
  ('folake-adeyemi', 'Folake Adeyemi', 'Visual Expert', 'Cameras, lenses and the light between them.', 'The right lens changes what you see, not just what you shoot.', 'Folake is a working photographer and cinematographer whose portraits and commercial work have appeared in campaigns across West Africa. At MobileTechJoint she leads everything to do with image capture: camera bodies, lenses, filters, monitors and the storage that keeps it all safe.

She judges cameras the way a shooter does, not the way a spreadsheet does. Autofocus that tracks a moving bride in low light, colour that flatters darker skin tones without heavy grading, a body that stays comfortable through a twelve-hour day — those are the criteria that decide what we carry.

Folake also insists on stocking the unglamorous essentials that separate a good shoot from a lost one: fast cards, reliable readers, and filters that do not add a colour cast. Her shelf is built for people whose work has to be right the first time.', '/team/folake-adeyemi.jpg', '[{"label":"Cameras","href":"/category/cameras"},{"label":"Sony","href":"/brand/sony"},{"label":"Canon","href":"/brand/canon"}]'::jsonb, 4),
  ('ibrahim-danladi', 'Ibrahim Danladi', 'Rigs Expert', 'Support, stability and everything that holds the shot.', 'A shaky frame is a wasted frame. Build the rig right and the rest follows.', 'Ibrahim came to MobileTechJoint from a film-equipment rental house, where he spent years building and repairing camera rigs for productions that could not afford a single failure. He knows exactly which tripods, arms, cages and clamps survive real use and which ones look solid in a photo and fold on the first job.

He tests every support product we consider under load, in heat and with the actual cameras and lights our customers pair them with. Magic arms that sag, ball heads that creep, quick-release plates that rattle — Ibrahim finds those problems before you ever would.

If you are building a rig, from a phone-and-cage setup to a full cinema build, Ibrahim is who our team asks first. The tripods, mounts and rigging on this site are the ones that passed his hands.', '/team/ibrahim-danladi.jpg', '[{"label":"Mounts","href":"/category/tripods-and-mounts"},{"label":"Rigs & Accessories","href":"/category/rigs-and-accessories"},{"label":"Joby","href":"/brand/joby"}]'::jsonb, 5);
