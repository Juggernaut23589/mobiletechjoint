-- Atomic, clamped stock decrement — called once per order_item from the
-- Paystack settlement path (see src/lib/paystack.ts settlePaidOrder).
--
-- Why an RPC instead of "UPDATE products SET stock_quantity = stock_quantity - $1":
-- doing the subtraction in the database in one statement avoids a
-- read-then-write race if two orders for the same product settle at nearly
-- the same instant. GREATEST(...,0) clamps at zero rather than going
-- negative — a completed payment must never be left unsettled over a stock
-- accounting edge case; slight oversell here is the safer failure mode than
-- refusing to record a payment that has already succeeded.

create or replace function decrement_stock(p_product_id uuid, p_quantity integer)
returns void as $$
begin
  update products
  set stock_quantity = greatest(stock_quantity - p_quantity, 0)
  where id = p_product_id;
end;
$$ language plpgsql security definer;

comment on function decrement_stock is
  'Atomically decrements stock, clamped at 0. security definer so it can run under the service-role client used by the Paystack settlement path.';
