"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { STAFF_COOKIE_NAME, decodeStaffSession, hasAbility } from "@/lib/staff-auth";

async function assertCanManageOrders() {
  const cookieStore = await cookies();
  const staffCookie = cookieStore.get(STAFF_COOKIE_NAME)?.value;
  const session = staffCookie ? await decodeStaffSession(staffCookie) : null;
  if (!hasAbility(session, "manage_orders")) throw new Error("Unauthorized");
}

/** Manual status correction (e.g. marking a paid order refunded after an
 *  offline refund). Deliberately does NOT allow setting "paid" — that
 *  only ever happens through the Paystack settlement path
 *  (lib/paystack.ts's settlePaidOrder), never a manual staff action, so a
 *  staff member can't fabricate a payment that didn't happen. */
export async function updateOrderStatus(formData: FormData): Promise<{ error?: string }> {
  try {
    await assertCanManageOrders();
  } catch {
    return { error: "Forbidden." };
  }

  const orderId = formData.get("orderId") as string;
  const status = formData.get("status") as string;
  if (!orderId) return { error: "Missing order." };
  if (!["failed", "refunded"].includes(status)) {
    return { error: "Staff can only mark an order failed or refunded." };
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
  if (error) return { error: error.message };

  revalidatePath(`/staff/dashboard/orders/${orderId}`);
  revalidatePath("/staff/dashboard/orders");
  return {};
}
