"use server";

import crypto from "crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { initializeTransaction } from "@/lib/paystack";

export interface CheckoutInput {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: { productId: string; quantity: number }[];
}

export type CheckoutResult =
  | { ok: true; authorizationUrl: string }
  | { ok: false; error: string };

/**
 * Re-validates and re-prices the entire order server-side. The client cart
 * (Zustand/localStorage) is treated as UNTRUSTED input — only productId and
 * quantity are read from it. Every price here comes fresh from the
 * database, so editing localStorage cannot change what a customer pays.
 */
export async function initiateCheckout(input: CheckoutInput): Promise<CheckoutResult> {
  if (!input.items.length) {
    return { ok: false, error: "Your cart is empty." };
  }
  if (!input.customerEmail || !input.customerName) {
    return { ok: false, error: "Name and email are required." };
  }

  const supabase = createServiceClient();

  const productIds = input.items.map((i) => i.productId);
  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, price_kobo, stock_quantity, status")
    .in("id", productIds);

  if (error) {
    return { ok: false, error: "Could not load products. Please try again." };
  }

  const byId = new Map((products ?? []).map((p) => [p.id, p]));

  let totalKobo = 0;
  const validatedItems: {
    productId: string;
    name: string;
    priceKobo: number;
    quantity: number;
  }[] = [];

  for (const item of input.items) {
    const product = byId.get(item.productId);

    if (!product || product.status !== "published") {
      return { ok: false, error: "One of the items in your cart is no longer available." };
    }
    if (product.price_kobo == null) {
      // Should be unreachable — the DB CHECK constraint blocks a published
      // product with a null price — but never trust that from application code alone.
      return { ok: false, error: "One of the items in your cart is not priced yet." };
    }
    if (item.quantity < 1 || item.quantity > product.stock_quantity) {
      return {
        ok: false,
        error: `Only ${product.stock_quantity} of "${product.name}" left in stock.`,
      };
    }

    totalKobo += product.price_kobo * item.quantity;
    validatedItems.push({
      productId: product.id,
      name: product.name,
      priceKobo: product.price_kobo,
      quantity: item.quantity,
    });
  }

  const reference = `mtj_${crypto.randomBytes(12).toString("hex")}`;

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      customer_name: input.customerName,
      customer_email: input.customerEmail,
      customer_phone: input.customerPhone || null,
      status: "pending",
      total_kobo: totalKobo,
      currency: "NGN",
      paystack_reference: reference,
    })
    .select("id")
    .single();

  if (orderError || !order) {
    console.error("Order creation failed:", orderError?.message);
    return { ok: false, error: "Could not create your order. Please try again." };
  }

  const { error: itemsError } = await supabase.from("order_items").insert(
    validatedItems.map((item) => ({
      order_id: order.id,
      product_id: item.productId,
      product_name_snapshot: item.name,
      unit_price_kobo_snapshot: item.priceKobo,
      quantity: item.quantity,
    }))
  );

  if (itemsError) {
    console.error("Order items creation failed:", itemsError.message);
    return { ok: false, error: "Could not create your order. Please try again." };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const result = await initializeTransaction({
    email: input.customerEmail,
    amountKobo: totalKobo,
    reference,
    callbackUrl: `${appUrl}/checkout/callback`,
    metadata: { order_id: order.id },
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  return { ok: true, authorizationUrl: result.authorizationUrl };
}
