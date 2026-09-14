-- Delivery pricing (per state/FCT — 37 rows, not per LGA, per explicit
-- decision: LGA-level precision for the customer's address, state-level
-- pricing since that's how Nigerian courier pricing is actually tiered),
-- the delivery fields on an order, and business expense tracking.

create table delivery_rates (
  state text primary key,
  price_kobo integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table delivery_rates enable row level security;
-- Anon needs to read this at checkout to quote a delivery fee before the
-- customer is necessarily logged in on every page (the price preview),
-- same reasoning as categories/products having a public read policy.
create policy delivery_rates_select_all on delivery_rates for select using (true);

-- Seeded at 0 (not null) so every state has a row from day one — the
-- checkout flow can rely on a row always existing and staff can see
-- every state listed as "not yet priced" rather than missing entirely.
insert into delivery_rates (state) values
  ('Abia'), ('Adamawa'), ('Akwa Ibom'), ('Anambra'), ('Bauchi'), ('Bayelsa'),
  ('Benue'), ('Borno'), ('Cross River'), ('Delta'), ('Ebonyi'), ('Edo'),
  ('Ekiti'), ('Enugu'), ('FCT - Abuja'), ('Gombe'), ('Imo'), ('Jigawa'),
  ('Kaduna'), ('Kano'), ('Katsina'), ('Kebbi'), ('Kogi'), ('Kwara'),
  ('Lagos'), ('Nasarawa'), ('Niger'), ('Ogun'), ('Ondo'), ('Osun'), ('Oyo'),
  ('Plateau'), ('Rivers'), ('Sokoto'), ('Taraba'), ('Yobe'), ('Zamfara');

alter table orders
  add column delivery_state text,
  add column delivery_lga text,
  add column delivery_address text,
  add column delivery_fee_kobo integer not null default 0;

create table expenses (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  amount_kobo integer not null check (amount_kobo > 0),
  category text,
  incurred_on date not null default current_date,
  recorded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table expenses enable row level security;
-- Default-deny (no anon/authenticated policy) — same pattern as
-- orders/order_items/staff_profiles. Staff-only access goes through the
-- service client with an explicit ability check in application code.
