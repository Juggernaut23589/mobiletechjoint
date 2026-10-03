"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireStaffAbility } from "@/lib/staff-session";
import { logStaffActivity } from "@/lib/activity-log";
import { parseTags } from "@/lib/customers";
import type { StaffSession } from "@/lib/staff-auth";

type Result = { error?: string; notice?: string };

async function customerManager(): Promise<StaffSession | null> {
  try {
    return await requireStaffAbility("manage_customers");
  } catch {
    return null;
  }
}

export async function addCustomerNote(_prev: Result, formData: FormData): Promise<Result> {
  const actor = await customerManager();
  if (!actor) return { error: "Forbidden." };
  const customerId = formData.get("customerId") as string;
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Write a note first." };
  if (body.length > 2000) return { error: "Notes are limited to 2,000 characters." };

  const { error } = await createServiceClient().from("customer_notes").insert({
    customer_id: customerId,
    body,
    staff_id: actor.userId,
    staff_name: actor.fullName,
  });
  if (error) return { error: error.message };

  await logStaffActivity(actor, {
    action: "customer.note",
    entityType: "customer",
    entityId: customerId,
    summary: `Added a note to a customer record`,
  });
  revalidatePath(`/staff/dashboard/customers/${customerId}`);
  return { notice: "Note added." };
}

export async function setCustomerTags(_prev: Result, formData: FormData): Promise<Result> {
  const actor = await customerManager();
  if (!actor) return { error: "Forbidden." };
  const customerId = formData.get("customerId") as string;
  const tags = parseTags(String(formData.get("tags") ?? ""));

  const supabase = createServiceClient();
  const { data: before } = await supabase.from("customer_profiles").select("tags, full_name").eq("id", customerId).maybeSingle();
  if (!before) return { error: "Customer not found." };

  const { error } = await supabase.from("customer_profiles").update({ tags }).eq("id", customerId);
  if (error) return { error: error.message };

  await logStaffActivity(actor, {
    action: "customer.tags",
    entityType: "customer",
    entityId: customerId,
    summary: `Tags for ${before.full_name ?? "customer"}: ${tags.length ? tags.join(", ") : "none"}`,
    changes: { tags: { from: before.tags, to: tags } },
  });
  revalidatePath(`/staff/dashboard/customers/${customerId}`);
  revalidatePath("/staff/dashboard/customers");
  return { notice: "Tags saved." };
}
