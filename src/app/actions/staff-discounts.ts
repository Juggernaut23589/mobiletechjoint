"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireStaffAbility } from "@/lib/staff-session";
import { logStaffActivity } from "@/lib/activity-log";
import { describeDiscount, normaliseCode } from "@/lib/discounts";
import { nairaToKobo } from "@/lib/money";
import type { StaffSession } from "@/lib/staff-auth";

type Result = { error?: string; notice?: string };

function optionalNaira(raw: FormDataEntryValue | null): number | null | "invalid" {
  const s = String(raw ?? "").replace(/,/g, "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? nairaToKobo(n) : "invalid";
}

function optionalInt(raw: FormDataEntryValue | null): number | null | "invalid" {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isInteger(n) && n > 0 ? n : "invalid";
}

/** datetime-local inputs carry no timezone; staff enter Lagos time. */
function lagosDateTime(raw: FormDataEntryValue | null): string | null {
  const s = String(raw ?? "").trim();
  return s ? `${s}:00+01:00` : null;
}

export async function createDiscountCode(_prev: Result, formData: FormData): Promise<Result> {
  let actor: StaffSession;
  try {
    actor = await requireStaffAbility("manage_promotions");
  } catch {
    return { error: "Forbidden." };
  }

  const code = normaliseCode(String(formData.get("code") ?? ""));
  if (!/^[A-Z0-9_-]{3,32}$/.test(code)) {
    return { error: "Codes are 3–32 letters, numbers, dashes or underscores." };
  }
  const kind: "fixed" | "percent" = formData.get("kind") === "fixed" ? "fixed" : "percent";
  const rawValue = Number(String(formData.get("value") ?? "").replace(/,/g, ""));
  if (!Number.isFinite(rawValue) || rawValue <= 0) return { error: "Enter the discount amount." };
  if (kind === "percent" && (!Number.isInteger(rawValue) || rawValue > 100)) {
    return { error: "A percentage must be a whole number from 1 to 100." };
  }
  const value = kind === "percent" ? rawValue : nairaToKobo(rawValue);

  const minSubtotal = optionalNaira(formData.get("minSubtotal"));
  const maxDiscount = optionalNaira(formData.get("maxDiscount"));
  const usageLimit = optionalInt(formData.get("usageLimit"));
  const perCustomer = optionalInt(formData.get("perCustomerLimit"));
  if ([minSubtotal, maxDiscount, usageLimit, perCustomer].includes("invalid")) {
    return { error: "Check the minimum order, cap and usage limits — they must be positive numbers." };
  }
  const startsAt = lagosDateTime(formData.get("startsAt"));
  const endsAt = lagosDateTime(formData.get("endsAt"));
  if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
    return { error: "The end date must be after the start date." };
  }

  const row = {
    code,
    description: String(formData.get("description") ?? "").trim() || null,
    kind,
    value,
    min_subtotal_kobo: (minSubtotal as number | null) ?? 0,
    max_discount_kobo: kind === "percent" ? (maxDiscount as number | null) : null,
    starts_at: startsAt,
    ends_at: endsAt,
    usage_limit: usageLimit as number | null,
    per_customer_limit: perCustomer as number | null,
    created_by: actor.userId,
    created_by_name: actor.fullName,
  };
  const { data, error } = await createServiceClient().from("discount_codes").insert(row).select("id").single();
  if (error) return { error: error.code === "23505" ? "That code already exists." : error.message };

  await logStaffActivity(actor, {
    action: "discount.create",
    entityType: "discount_code",
    entityId: data.id,
    summary: `Created discount code ${code} — ${describeDiscount(row)}`,
    changes: row,
  });
  revalidatePath("/staff/dashboard/discounts");
  return { notice: `${code} created.` };
}

export async function setDiscountActive(formData: FormData): Promise<void> {
  let actor: StaffSession;
  try {
    actor = await requireStaffAbility("manage_promotions");
  } catch {
    return;
  }
  const id = formData.get("id") as string;
  const isActive = formData.get("isActive") === "true";
  const { data } = await createServiceClient()
    .from("discount_codes")
    .update({ is_active: isActive })
    .eq("id", id)
    .select("code")
    .maybeSingle();
  if (!data) return;
  await logStaffActivity(actor, {
    action: isActive ? "discount.activate" : "discount.deactivate",
    entityType: "discount_code",
    entityId: id,
    summary: `${isActive ? "Switched on" : "Switched off"} discount code ${data.code}`,
  });
  revalidatePath("/staff/dashboard/discounts");
}
