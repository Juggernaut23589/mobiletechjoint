-- Merchandising flags for the storefront redesign (hero carousel, trending
-- section). There is no real order/sales history yet (0 orders placed as of
-- this migration), so "hot selling" / "trending" can't be computed from
-- actual demand — these are admin-curated booleans, toggled from
-- /admin/products, until enough real order data exists to compute this
-- automatically instead.

alter table products
  add column is_featured boolean not null default false,
  add column is_trending boolean not null default false;

create index products_is_featured_idx on products (is_featured) where is_featured = true;
create index products_is_trending_idx on products (is_trending) where is_trending = true;
