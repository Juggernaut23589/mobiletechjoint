-- Adds OPay as a second payment provider alongside Paystack. orders.
-- paystack_reference is kept as-is and reused as the general merchant
-- reference column for OPay orders too — despite the name, it was always
-- just our own generated `mtj_...` string (see its original comment in
-- 20260907000001_init.sql), never something Paystack itself produced, so
-- it doubles as the provider-agnostic idempotency key without a rename.
alter table orders
  add column payment_provider text not null default 'paystack'
    check (payment_provider in ('paystack', 'opay')),
  add column opay_order_no text,
  add column opay_verified_at timestamptz,
  add column opay_fee_kobo integer not null default 0 check (opay_fee_kobo >= 0);

create index idx_orders_opay_order_no on orders(opay_order_no) where opay_order_no is not null;
