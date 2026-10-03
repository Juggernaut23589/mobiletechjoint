"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireStaffAbility } from "@/lib/staff-session";
import { logStaffActivity } from "@/lib/activity-log";
import { formatNaira, nairaToKobo } from "@/lib/money";
import type { StaffSession } from "@/lib/staff-auth";

export async function updateDeliveryRate(formData: FormData): Promise<{ error?: string }> {
  let actor: StaffSession;
  try {
    actor = await requireStaffAbility("manage_deliveries");
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
  const { data: before } = await supabase
    .from("delivery_rates")
    .select("price_kobo")
    .eq("state", state)
    .maybeSingle();

  const priceKobo = nairaToKobo(priceNaira);
  const { error } = await supabase
    .from("delivery_rates")
    .update({ price_kobo: priceKobo, updated_at: new Date().toISOString() })
    .eq("state", state);
  if (error) return { error: error.message };

  if (before?.price_kobo !== priceKobo) {
    await logStaffActivity(actor, {
      action: "delivery_rate.update",
      entityType: "delivery_rate",
      entityId: state,
      summary: `Set ${state} delivery to ${formatNaira(priceKobo)} (was ${formatNaira(before?.price_kobo ?? 0)})`,
      changes: { price_kobo: { from: before?.price_kobo ?? null, to: priceKobo } },
    });
  }

  revalidatePath("/staff/dashboard/deliveries");
  return {};
}
