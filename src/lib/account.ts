import { createServiceClient } from "@/lib/supabase/server";
import type {
  CustomerProfile,
  OrderWithItems,
  SavedPaymentMethod,
  ProductWithImages,
} from "@/types/database";

/** Every function here takes an explicit customerId (from the authed
 *  session, checked by the caller) and uses the service client scoped by
 *  an explicit .eq("customer_id", ...) filter — same pattern the admin
 *  pages already use, rather than relying on RLS as the enforcement point. */

export async function getCustomerProfile(customerId: string): Promise<CustomerProfile | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("customer_profiles")
    .select("*")
    .eq("id", customerId)
    .maybeSingle();
  return data;
}

export async function getCustomerOrders(customerId: string): Promise<OrderWithItems[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getCustomerOrders failed:", error.message);
    return [];
  }
  return (data ?? []) as unknown as OrderWithItems[];
}

export async function getCustomerOrder(
  customerId: string,
  orderId: string
): Promise<OrderWithItems | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("customer_id", customerId)
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    console.error("getCustomerOrder failed:", error.message);
    return null;
  }
  return data as unknown as OrderWithItems | null;
}

/** Wishlisted products, newest-saved first — joins through wishlist_items
 *  to the full product (with images/brand/category) the same shape every
 *  other product grid expects, so ProductCard just works here too. A
 *  product removed/unpublished after being saved silently drops out
 *  (the inner join on products only returns rows that still exist). */
export async function getWishlistProducts(customerId: string): Promise<ProductWithImages[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("wishlist_items")
    .select("created_at, products(*, product_images(*), category:categories(*), brand:brands(*))")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getWishlistProducts failed:", error.message);
    return [];
  }
  return (data ?? [])
    .map((row) => row.products)
    .filter((p): p is NonNullable<typeof p> => p !== null) as unknown as ProductWithImages[];
}

export async function getSavedPaymentMethods(customerId: string): Promise<SavedPaymentMethod[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("saved_payment_methods")
    .select("*")
    .eq("customer_id", customerId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getSavedPaymentMethods failed:", error.message);
    return [];
  }
  return data ?? [];
}
