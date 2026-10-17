-- Admin-curated New Arrivals, same shape as is_featured/is_trending
-- (20260908000002_merchandising.sql) — getNewArrivals() in lib/products.ts
-- prefers these picks when any exist, falling back to recency otherwise.
alter table products add column is_new_arrival boolean not null default false;

create index products_is_new_arrival_idx on products (is_new_arrival) where is_new_arrival = true;
