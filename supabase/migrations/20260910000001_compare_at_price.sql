-- Real discount badges (à la Konga's "-42%" tags) need a real "was" price,
-- not a fabricated one. Admin-entered only, via /admin/products — never
-- computed or guessed. Only meaningful as a discount when it's actually
-- higher than the current price, hence the check.
alter table products
  add column compare_at_price_kobo integer,
  add constraint compare_at_price_is_discount
    check (
      compare_at_price_kobo is null
      or price_kobo is null
      or compare_at_price_kobo > price_kobo
    );
