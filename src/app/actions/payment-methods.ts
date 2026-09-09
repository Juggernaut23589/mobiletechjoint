"use server";

import { revalidatePath } from "next/cache";
import { createServerAuthClient, createServiceClient } from "@/lib/supabase/server";

async function requireCustomerId(): Promise<string> {
  const supabase = await createServerAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return user.id;
}

export async function deletePaymentMethod(formData: FormData): Promise<{ error?: string }> {
  const customerId = await requireCustomerId();
  const id = formData.get("id") as string;
  if (!id) return { error: "Missing payment method." };

  const service = createServiceClient();
  // Scoped by customer_id, not just id — a customer can only ever delete
  // their own saved method, even though this uses the service client.
  const { error } = await service
    .from("saved_payment_methods")
    .delete()
    .eq("id", id)
    .eq("customer_id", customerId);

  if (error) return { error: error.message };

  revalidatePath("/account/payment-methods");
  return {};
}

export async function setDefaultPaymentMethod(formData: FormData): Promise<{ error?: string }> {
  const customerId = await requireCustomerId();
  const id = formData.get("id") as string;
  if (!id) return { error: "Missing payment method." };

  const service = createServiceClient();
  await service.from("saved_payment_methods").update({ is_default: false }).eq("customer_id", customerId);
  const { error } = await service
    .from("saved_payment_methods")
    .update({ is_default: true })
    .eq("id", id)
    .eq("customer_id", customerId);

  if (error) return { error: error.message };

  revalidatePath("/account/payment-methods");
  return {};
}
