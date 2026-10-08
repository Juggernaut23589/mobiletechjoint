-- Product reviews — closes the "no reviews or social proof anywhere" gap
-- from the front-end audit. Moderated (status defaults to 'pending', only
-- 'approved' rows are public) rather than live-on-submit, since an
-- unmoderated review is a spam/libel exposure the staff backend doesn't
-- yet have tooling to clean up after the fact.
create type review_status as enum ('pending', 'approved', 'rejected');

create table product_reviews (
  id                    uuid primary key default gen_random_uuid(),
  product_id            uuid not null references products(id) on delete cascade,
  -- Nullable: a review's author account can be deleted without deleting
  -- the review itself, same reasoning as orders.customer_id.
  customer_id           uuid references auth.users(id) on delete set null,
  -- Set server-side by checking for a paid order containing this product
  -- at submission time — never trust a client-supplied "verified" flag.
  order_id              uuid references orders(id) on delete set null,
  is_verified_purchase  boolean not null default false,
  reviewer_name         text not null check (length(trim(reviewer_name)) > 0),
  rating                smallint not null check (rating between 1 and 5),
  title                 text,
  body                  text not null check (length(trim(body)) > 0),
  status                review_status not null default 'pending',
  moderated_by          text,
  moderated_at          timestamptz,
  moderation_note       text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  -- One review per customer per product — keeps the submission form a
  -- straightforward "edit your review" case instead of unbounded spam.
  unique (product_id, customer_id)
);

create index product_reviews_product_id_idx on product_reviews (product_id);
create index product_reviews_status_idx on product_reviews (status);
create index product_reviews_customer_id_idx on product_reviews (customer_id);

create trigger trg_product_reviews_updated_at before update on product_reviews
  for each row execute function set_updated_at();

alter table product_reviews enable row level security;

create policy "public can read approved reviews"
  on product_reviews for select
  to anon
  using (status = 'approved');

create policy "customers can read their own reviews"
  on product_reviews for select
  to authenticated
  using (customer_id = auth.uid());

create policy "customers can insert their own review"
  on product_reviews for insert
  to authenticated
  with check (customer_id = auth.uid());

create policy "customers can update their own pending review"
  on product_reviews for update
  to authenticated
  using (customer_id = auth.uid() and status = 'pending')
  with check (customer_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Denormalised rating on products — PLP/PDP read this directly rather than
-- aggregating product_reviews on every render. Kept in sync by a trigger
-- rather than recomputed in application code, same pattern as the stock
-- ledger (apply_stock_change()).
-- ---------------------------------------------------------------------------
alter table products add column rating_avg numeric(2,1);
alter table products add column rating_count integer not null default 0;

create or replace function refresh_product_rating(p_product_id uuid) returns void as $$
  update products
  set rating_avg = (
        select round(avg(rating)::numeric, 1)
        from product_reviews
        where product_id = p_product_id and status = 'approved'
      ),
      rating_count = (
        select count(*)
        from product_reviews
        where product_id = p_product_id and status = 'approved'
      )
  where id = p_product_id;
$$ language sql security definer;

create or replace function trg_refresh_product_rating() returns trigger as $$
begin
  if TG_OP = 'DELETE' then
    perform refresh_product_rating(OLD.product_id);
    return OLD;
  end if;

  perform refresh_product_rating(NEW.product_id);
  if TG_OP = 'UPDATE' and OLD.product_id <> NEW.product_id then
    perform refresh_product_rating(OLD.product_id);
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

create trigger trg_product_reviews_rating
  after insert or update or delete on product_reviews
  for each row execute function trg_refresh_product_rating();
