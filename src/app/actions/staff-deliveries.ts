"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { STAFF_COOKIE_NAME, decodeStaffSession, hasAbility } from "@/lib/staff-auth";
import { nairaToKobo } from "@/lib/money";

async function assertCanManageDeliveries() {
  const cookieStore = await cookies();
  const staffCookie = cookieStore.get(STAFF_COOKIE_NAME)?.value;
  const session = staffCookie ? await decodeStaffSession(staffCookie) : null;
  if (!hasAbility(session, "manage_deliveries")) throw new Error("Unauthorized");
}

export async function updateDeliveryRate(formData: FormData): Promise<{ error?: string }> {
  try {
    await assertCanManageDeliveries();
  } catch {
    return { error: "Forbidden." };
  }

  const state = formData.get("state") as string;
  const priceNaira = Number(formData.get("priceNaira"));

  if (!state) return { error: "Missing state." };
  if (!Number.isFinite(priceNaira) || priceNaira < 0) {
    return { error: "Enter a valid delivery price." };
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("delivery_rates")
    .update({ price_kobo: nairaToKobo(priceNaira), updated_at: new Date().toISOString() })
    .eq("state", state);

  if (error) return { error: error.message };

  revalidatePath("/staff/dashboard/deliveries");
  return {};
}
