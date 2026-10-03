-- Phase 1 operations: order fulfilment, refunds, a stock ledger, and
-- automatic expiry of unpaid orders.

-- ── Unpaid order expiry ────────────────────────────────────────────────
-- Paystack can still settle an expired order late (settlePaidOrder only
-- skips orders already 'paid'), so a slow bank transfer is never lost.
alter type order_status add value if not exists 'expired';

-- ── Fulfilment ─────────────────────────────────────────────────────────
-- Separate from orders.status, which is purely the payment state.
create type fulfillment_status as enum (
  'unfulfilled', 'processing', 'packed', 'dispatched', 'delivered', 'cancelled', 'returned'
);

alter table orders
  add column fulfillment_status fulfillment_status not null default 'unfulfilled',
  add column dispatch_method text check (dispatch_method in ('rider', 'courier')),
  add column rider_staff_id uuid references staff_profiles (id) on delete set null,
  add column courier_name text,
  add column tracking_number text,
  add column processing_at timestamptz,
  add column packed_at timestamptz,
  add column dispatched_at timestamptz,
  add column delivered_at timestamptz,
  add column cancelled_at timestamptz,
  add column returned_at timestamptz,
  add column refunded_kobo integer not null default 0 check (refunded_kobo >= 0);

create index orders_status_fulfillment_idx on orders (status, fulfillment_status);

-- ── Refunds ────────────────────────────────────────────────────────────
create type refund_status as enum ('pending_approval', 'processing', 'completed', 'failed', 'rejected');

create table refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  amount_kobo integer not null check (amount_kobo > 0),
  reason text not null,
  -- 'paystack' = sent back to the original payment; 'offline' = money was
  -- already returned another way (e.g. bank transfer) and is only recorded.
  method text not null check (method in ('paystack', 'offline')),
  -- [{ "product_id": uuid, "name": text, "quantity": int }] returned to stock
  restock_items jsonb not null default '[]',
  status refund_status not null,
  requested_by uuid references staff_profiles (id) on delete set null,
  requested_by_name text not null,
  decided_by uuid references staff_profiles (id) on delete set null,
  decided_by_name text,
  paystack_refund_id text unique,
  failure_reason text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index refunds_order_idx on refunds (order_id, created_at desc);
create index refunds_status_idx on refunds (status);
create trigger trg_refunds_updated_at before update on refunds
  for each row execute function set_updated_at();
alter table refunds enable row level security;

-- Atomically adds (or, with a negative amount, reverses) a refund against
-- an order. Refuses to take refunded_kobo above the order total or below
-- zero, so two staff refunding at once can never over-refund. Flips the
-- payment status to 'refunded' once the full total has been returned.
create or replace function add_order_refund(p_order_id uuid, p_amount integer)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_refunded integer;
begin
  update orders
     set refunded_kobo = refunded_kobo + p_amount,
         status = case when refunded_kobo + p_amount >= total_kobo
                       then 'refunded'::order_status else 'paid'::order_status end
   where id = p_order_id
     and status in ('paid', 'refunded')
     and refunded_kobo + p_amount between 0 and total_kobo
  returning refunded_kobo into v_refunded;
  if not found then
    raise exception 'Refund would exceed the amount paid, or the order is not refundable';
  end if;
  return v_refunded;
end;
$$;

-- ── Stock ledger ───────────────────────────────────────────────────────
alter table products
  add column reorder_level integer not null default 3 check (reorder_level >= 0),
  -- PostgREST can't compare two columns in a filter, so expose it directly.
  add column is_low_stock boolean generated always as (stock_quantity <= reorder_level) stored;

create index products_low_stock_idx on products (is_low_stock) where is_low_stock;

create table stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  delta integer not null,
  quantity_after integer not null,
  reason text not null check (reason in (
    'initial', 'sale', 'restock', 'count', 'correction', 'damage', 'loss',
    'return', 'refund_restock', 'cancellation'
  )),
  note text,
  order_id uuid references orders (id) on delete set null,
  staff_id uuid references staff_profiles (id) on delete set null,
  staff_name text,
  created_at timestamptz not null default now()
);

create index stock_movements_product_idx on stock_movements (product_id, created_at desc);
alter table stock_movements enable row level security;

-- The only way stock should change from now on: locks the product row,
-- applies either a relative change ('delta') or an absolute count ('set'),
-- clamps at zero, and records the movement in the same transaction.
create or replace function apply_stock_change(
  p_product_id uuid,
  p_mode text,
  p_value integer,
  p_reason text,
  p_note text default null,
  p_order_id uuid default null,
  p_staff_id uuid default null,
  p_staff_name text default null
)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_before integer;
  v_after integer;
begin
  if p_mode not in ('delta', 'set') then
    raise exception 'Invalid stock change mode: %', p_mode;
  end if;

  select stock_quantity into v_before from products where id = p_product_id for update;
  if not found then
    raise exception 'Product % not found', p_product_id;
  end if;

  v_after := greatest(case when p_mode = 'set' then p_value else v_before + p_value end, 0);
  if v_after = v_before then
    return v_after;
  end if;

  update products set stock_quantity = v_after where id = p_product_id;
  insert into stock_movements (product_id, delta, quantity_after, reason, note, order_id, staff_id, staff_name)
  values (p_product_id, v_after - v_before, v_after, p_reason, p_note, p_order_id, p_staff_id, p_staff_name);
  return v_after;
end;
$$;

-- Opening balance, so every product's ledger sums to its current stock.
insert into stock_movements (product_id, delta, quantity_after, reason, note)
select id, stock_quantity, stock_quantity, 'initial', 'Opening balance when stock tracking began'
from products
where stock_quantity > 0;

-- Server-only: never callable with the browser-shipped anon key.
revoke execute on function add_order_refund(uuid, integer) from public, anon, authenticated;
grant execute on function add_order_refund(uuid, integer) to service_role;
revoke execute on function apply_stock_change(uuid, text, integer, text, text, uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function apply_stock_change(uuid, text, integer, text, text, uuid, uuid, text)
  to service_role;

-- ── Scheduled expiry (every 15 minutes) ────────────────────────────────
create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule(
  'expire-pending-orders',
  '*/15 * * * *',
  $$update public.orders set status = 'expired'
    where status = 'pending' and created_at < now() - interval '24 hours'$$
);
