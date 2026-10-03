-- Phase 2: suppliers, purchase orders (NGN or USD), weighted-average cost
-- prices, cost-of-sale snapshots, Paystack fees, and expense controls.
-- Costs are the supplier's unit price only — no shipping/customs loading.

-- ── Suppliers ──────────────────────────────────────────────────────────
create table suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  kind text not null default 'local' check (kind in ('local', 'import')),
  currency text not null default 'NGN' check (currency in ('NGN', 'USD')),
  contact_name text,
  phone text,
  email text,
  address text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_suppliers_updated_at before update on suppliers
  for each row execute function set_updated_at();
alter table suppliers enable row level security;

-- ── Cost prices ────────────────────────────────────────────────────────
-- Weighted-average cost in kobo, maintained when goods are received.
-- Null = not known yet (most of the imported catalogue).
alter table products add column cost_kobo integer check (cost_kobo >= 0);

-- Cost at the moment of sale, so later cost changes never rewrite
-- historical margins (same principle as the price snapshot).
alter table order_items add column unit_cost_kobo_snapshot integer;

alter table orders add column paystack_fee_kobo integer not null default 0 check (paystack_fee_kobo >= 0);

-- ── Purchase orders ────────────────────────────────────────────────────
create type purchase_order_status as enum ('draft', 'ordered', 'partially_received', 'received', 'cancelled');
create sequence purchase_order_number_seq;

create table purchase_orders (
  id uuid primary key default gen_random_uuid(),
  po_number text not null unique
    default 'PO-' || lpad(nextval('purchase_order_number_seq')::text, 4, '0'),
  supplier_id uuid not null references suppliers (id) on delete restrict,
  status purchase_order_status not null default 'draft',
  currency text not null check (currency in ('NGN', 'USD')),
  -- Naira per dollar for USD orders; always 1 for NGN. Can be updated at
  -- receipt to the rate actually paid.
  exchange_rate numeric(12, 4) not null default 1 check (exchange_rate > 0),
  expected_date date,
  notes text,
  created_by uuid references staff_profiles (id) on delete set null,
  created_by_name text not null,
  ordered_at timestamptz,
  received_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (currency = 'USD' or exchange_rate = 1)
);
create index purchase_orders_supplier_idx on purchase_orders (supplier_id, created_at desc);
create index purchase_orders_status_idx on purchase_orders (status);
create trigger trg_purchase_orders_updated_at before update on purchase_orders
  for each row execute function set_updated_at();
alter table purchase_orders enable row level security;

create table purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references purchase_orders (id) on delete cascade,
  product_id uuid not null references products (id) on delete restrict,
  quantity_ordered integer not null check (quantity_ordered > 0),
  quantity_received integer not null default 0,
  -- In the order's currency's minor unit: kobo for NGN, cents for USD.
  unit_cost_minor integer not null check (unit_cost_minor >= 0),
  created_at timestamptz not null default now(),
  check (quantity_received between 0 and quantity_ordered),
  unique (purchase_order_id, product_id)
);
create index purchase_order_items_product_idx on purchase_order_items (product_id);
alter table purchase_order_items enable row level security;

create table purchase_order_payments (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references purchase_orders (id) on delete cascade,
  amount_minor integer not null check (amount_minor > 0),
  paid_on date not null default current_date,
  method text,
  note text,
  recorded_by uuid references staff_profiles (id) on delete set null,
  recorded_by_name text not null,
  created_at timestamptz not null default now()
);
create index purchase_order_payments_po_idx on purchase_order_payments (purchase_order_id);
alter table purchase_order_payments enable row level security;

-- ── Stock ledger: purchases ────────────────────────────────────────────
alter table stock_movements drop constraint stock_movements_reason_check;
alter table stock_movements add constraint stock_movements_reason_check check (reason in (
  'initial', 'sale', 'restock', 'count', 'correction', 'damage', 'loss',
  'return', 'refund_restock', 'cancellation', 'purchase'
));
alter table stock_movements
  add column purchase_order_id uuid references purchase_orders (id) on delete set null;

-- Receives goods against one purchase-order line: adds stock, records the
-- movement, recalculates the product's weighted-average cost from the
-- line's unit cost converted at p_exchange_rate, and advances the order's
-- status. All in one transaction with the line and product rows locked.
create or replace function receive_purchase_item(
  p_item_id uuid,
  p_quantity integer,
  p_exchange_rate numeric,
  p_staff_id uuid,
  p_staff_name text
)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_item purchase_order_items%rowtype;
  v_po purchase_orders%rowtype;
  v_stock integer;
  v_cost integer;
  v_unit_kobo integer;
  v_after integer;
begin
  if p_quantity <= 0 then
    raise exception 'Quantity received must be positive';
  end if;

  select * into v_item from purchase_order_items where id = p_item_id for update;
  if not found then raise exception 'Purchase order line not found'; end if;
  select * into v_po from purchase_orders where id = v_item.purchase_order_id for update;
  if v_po.status not in ('ordered', 'partially_received') then
    raise exception 'Purchase order % is %, not open for receiving', v_po.po_number, v_po.status;
  end if;
  if v_item.quantity_received + p_quantity > v_item.quantity_ordered then
    raise exception 'Receiving % would exceed the % ordered', v_item.quantity_received + p_quantity, v_item.quantity_ordered;
  end if;

  v_unit_kobo := round(v_item.unit_cost_minor * (case when v_po.currency = 'USD' then p_exchange_rate else 1 end));

  select stock_quantity, cost_kobo into v_stock, v_cost from products where id = v_item.product_id for update;
  v_stock := greatest(v_stock, 0);
  v_after := v_stock + p_quantity;

  update products
     set stock_quantity = v_after,
         cost_kobo = case
           when cost_kobo is null or v_stock = 0 then v_unit_kobo
           else round((v_stock::numeric * cost_kobo + p_quantity::numeric * v_unit_kobo) / v_after)
         end
   where id = v_item.product_id;

  insert into stock_movements (product_id, delta, quantity_after, reason, note, purchase_order_id, staff_id, staff_name)
  values (v_item.product_id, p_quantity, v_after, 'purchase', 'Received on ' || v_po.po_number,
          v_po.id, p_staff_id, p_staff_name);

  update purchase_order_items set quantity_received = quantity_received + p_quantity where id = p_item_id;

  update purchase_orders po
     set status = case
           when not exists (
             select 1 from purchase_order_items i
             where i.purchase_order_id = po.id and i.quantity_received < i.quantity_ordered
           ) then 'received'::purchase_order_status
           else 'partially_received'::purchase_order_status
         end,
         received_at = case
           when not exists (
             select 1 from purchase_order_items i
             where i.purchase_order_id = po.id and i.quantity_received < i.quantity_ordered
           ) then now() else received_at
         end,
         exchange_rate = case when po.currency = 'USD' then p_exchange_rate else 1 end
   where po.id = v_po.id;
end;
$$;

revoke execute on function receive_purchase_item(uuid, integer, numeric, uuid, text) from public, anon, authenticated;
grant execute on function receive_purchase_item(uuid, integer, numeric, uuid, text) to service_role;

-- ── Expenses: approval, receipts, void instead of delete ───────────────
alter table expenses
  add column status text not null default 'approved'
    check (status in ('pending_approval', 'approved', 'rejected')),
  add column recorded_by_name text,
  add column approved_by uuid references staff_profiles (id) on delete set null,
  add column approved_by_name text,
  add column receipt_path text,
  add column voided_at timestamptz,
  add column voided_by uuid references staff_profiles (id) on delete set null,
  add column voided_by_name text,
  add column void_reason text;
create index expenses_incurred_on_idx on expenses (incurred_on);

-- Private bucket: receipts are only ever served through short-lived
-- signed URLs generated after a staff permission check.
insert into storage.buckets (id, name, public)
values ('expense-receipts', 'expense-receipts', false)
on conflict (id) do nothing;
