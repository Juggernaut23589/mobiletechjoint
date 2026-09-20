-- Products imported from a sister store's catalogue (camerajoint.ng, via
-- scripts/import-catalogue.mjs) need a stable per-source identifier for
-- idempotent re-runs and for later bulk operations ("publish everything
-- from that import", "archive everything that is NOT from it").
--
-- woocommerce_id can't be reused: it is UNIQUE and the original store's
-- IDs (1713–9651) overlap the sister store's (411–37800).

alter type product_source add value if not exists 'catalogue_import';

alter table products
  add column source_ref text unique;

comment on column products.source_ref is
  'Origin identifier for imported rows, e.g. "camerajoint:37800". Null for products created in this store.';
