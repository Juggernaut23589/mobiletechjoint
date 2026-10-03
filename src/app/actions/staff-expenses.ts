"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireStaffAbility } from "@/lib/staff-session";
import { logStaffActivity } from "@/lib/activity-log";
import { formatNaira, nairaToKobo } from "@/lib/money";
import type { StaffSession } from "@/lib/staff-auth";

/** recorded_by references auth.users, but staff accounts are Supabase
 *  Auth users too (created via admin.createUser at registration) — so the
 *  staff session's userId is a valid auth.users id here, same identity
 *  space the customer account system also lives in. */
export async function addExpense(formData: FormData): Promise<{ error?: string }> {
  let actor: StaffSession;
  try {
    actor = await requireStaffAbility("manage_expenses");
  } catch {
    return { error: "Forbidden." };
  }

  const description = (formData.get("description") as string)?.trim();
  const amountNaira = Number(formData.get("amountNaira"));
  const category = (formData.get("category") as string)?.trim();
  const incurredOn = formData.get("incurredOn") as string;

  if (!description) return { error: "Enter a description." };
  if (!Number.isFinite(amountNaira) || amountNaira <= 0) {
    return { error: "Enter a valid amount." };
  }

  const row = {
    description,
    amount_kobo: nairaToKobo(amountNaira),
    category: category || null,
    incurred_on: incurredOn || new Date().toISOString().slice(0, 10),
    recorded_by: actor.userId,
  };
  const { data, error } = await createServiceClient().from("expenses").insert(row).select("id").single();
  if (error) return { error: error.message };

  await logStaffActivity(actor, {
    action: "expense.add",
    entityType: "expense",
    entityId: data.id,
    summary: `Recorded expense ${formatNaira(row.amount_kobo)} — ${description}`,
    changes: row,
  });

  revalidatePath("/staff/dashboard/expenses");
  revalidatePath("/staff/dashboard/sales");
  return {};
}

/** Void return, not {error?} — invoked directly as a Server Component
 *  <form action>, whose type signature requires void/Promise<void> (see
 *  removeCategoryComplement in admin-crosssells.ts for the same pattern
 *  and reasoning). A failed delete just leaves the row in place. The full
 *  deleted row is kept in the activity log so the expense isn't lost. */
export async function deleteExpense(formData: FormData): Promise<void> {
  let actor: StaffSession;
  try {
    actor = await requireStaffAbility("manage_expenses");
  } catch {
    return;
  }

  const id = formData.get("id") as string;
  if (!id) return;

  const supabase = createServiceClient();
  const { data: expense } = await supabase.from("expenses").select("*").eq("id", id).maybeSingle();
  if (!expense) return;

  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) return;

  await logStaffActivity(actor, {
    action: "expense.delete",
    entityType: "expense",
    entityId: id,
    summary: `Deleted expense ${formatNaira(expense.amount_kobo)} — ${expense.description}`,
    changes: expense,
  });

  revalidatePath("/staff/dashboard/expenses");
  revalidatePath("/staff/dashboard/sales");
}
