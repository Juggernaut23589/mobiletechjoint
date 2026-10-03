-- decrement_stock is SECURITY DEFINER and, like every new function, was
-- executable by PUBLIC — which on Supabase includes the anon key shipped
-- to every browser. Anyone could call /rest/v1/rpc/decrement_stock and zero
-- out any product's stock. Only the server (service role, used by the
-- Paystack settlement path) should ever call it.
revoke execute on function public.decrement_stock(uuid, integer) from public, anon, authenticated;
grant execute on function public.decrement_stock(uuid, integer) to service_role;
