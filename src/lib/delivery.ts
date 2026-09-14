import { createPublicClient, createServiceClient } from "@/lib/supabase/server";

export interface DeliveryRate {
  state: string;
  price_kobo: number;
  updated_at: string;
}

/** Public — checkout needs this to quote a delivery fee. delivery_rates
 *  has an anon select policy for exactly this reason. */
export async function getDeliveryRates(): Promise<DeliveryRate[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase.from("delivery_rates").select("*").order("state");
  if (error) {
    console.error("getDeliveryRates failed:", error.message);
    return [];
  }
  return data ?? [];
}

/** Server-side lookup at checkout-initiation time — never trust a
 *  client-supplied delivery fee, only ever the state name, same pattern
 *  as re-pricing every cart item from the database. */
export async function getDeliveryFeeKobo(state: string): Promise<number | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("delivery_rates")
    .select("price_kobo")
    .eq("state", state)
    .maybeSingle();
  return data?.price_kobo ?? null;
}
