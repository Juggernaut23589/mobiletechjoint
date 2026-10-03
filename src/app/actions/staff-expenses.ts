"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireStaffAbility, requireSuperAdmin } from "@/lib/staff-session";
import { logStaffActivity } from "@/lib/activity-log";
import { formatNaira, nairaToKobo } from "@/lib/money";
import { EXPENSE_APPROVAL_LIMIT_KOBO, MAX_RECEIPT_BYTES, RECEIPT_BUCKET } from "@/lib/expenses";
import type { StaffSession } from "@/lib/staff-auth";

type Result = { error?: string; notice?: string };

function revalidateExpenses() {
  revalidatePath("/staff/dashboard/expenses");
  revalidatePath("/staff/dashboard/sales");
  revalidatePath("/staff/dashboard");
}

/** recorded_by references auth.users, but staff accounts are Supabase
 *  Auth users too (created via admin.createUser at registration) — so the
 *  staff session's userId is a valid auth.users id here. */
export async function addExpense(_prev: Result, formData: FormData): Promise<Result> {
  let actor: StaffSession;
  try {
    actor = await requireStaffAbility("manage_expenses");
  } catch {
    return { error: "Forbidden." };
  }

  const description = (formData.get("description") as string)?.trim();
  const amountNaira = Number(String(formData.get("amountNaira") ?? "").replace(/,/g, ""));
  const category = (formData.get("category") as string)?.trim();
  const incurredOn = formData.get("incurredOn") as string;
  const receipt = formData.get("receipt");
  const file = receipt instanceof File && receipt.size > 0 ? receipt : null;

  if (!description) return { error: "Enter a description." };
  if (!Number.isFinite(amountNaira) || amountNaira <= 0) return { error: "Enter a valid amount." };
  if (file && file.size > MAX_RECEIPT_BYTES) return { error: "The receipt must be under 10MB." };
  if (file && !file.type.startsWith("image/") && file.type !== "application/pdf") {
    return { error: "The receipt must be an image or a PDF." };
  }

  const amountKobo = nairaToKobo(amountNaira);
  const needsApproval = actor.role !== "super_admin" && amountKobo > EXPENSE_APPROVAL_LIMIT_KOBO;
  const row = {
    description,
    amount_kobo: amountKobo,
    category: category || null,
    incurred_on: incurredOn || new Date().toISOString().slice(0, 10),
    recorded_by: actor.userId,
    recorded_by_name: actor.fullName,
    status: needsApproval ? "pending_approval" : "approved",
    approved_by: needsApproval ? null : actor.userId,
    approved_by_name: needsApproval ? null : actor.fullName,
  };

  const supabase = createServiceClient();
  const { data, error } = await supabase.from("expenses").insert(row).select("id").single();
  if (error) return { error: error.message };

  let receiptNote = "";
  if (file) {
    const safeName = file.name.replace(/[^\w.-]+/g, "_").slice(-80);
    const path = `${row.incurred_on.slice(0, 7)}/${data.id}-${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from(RECEIPT_BUCKET)
      .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type });
    if (uploadError) {
      receiptNote = ` The receipt didn't upload (${uploadError.message}).`;
    } else {
      await supabase.from("expenses").update({ receipt_path: path }).eq("id", data.id);
    }
  }

  await logStaffActivity(actor, {
    action: "expense.add",
    entityType: "expense",
    entityId: data.id,
    summary: `Recorded expense ${formatNaira(amountKobo)} — ${description}${needsApproval ? " (awaiting approval)" : ""}`,
    changes: row,
  });

  revalidateExpenses();
  return {
    notice: needsApproval
      ? `Saved. Expenses over ${formatNaira(EXPENSE_APPROVAL_LIMIT_KOBO)} need a super admin's approval before they count.${receiptNote}`
      : `Expense recorded.${receiptNote}`,
  };
}

export async function decideExpense(formData: FormData): Promise<void> {
  let actor: StaffSession;
  try {
    actor = await requireSuperAdmin();
  } catch {
    return;
  }
  const id = formData.get("id") as string;
  const approve = formData.get("decision") === "approve";

  const { data: expense } = await createServiceClient()
    .from("expenses")
    .update({
      status: approve ? "approved" : "rejected",
      approved_by: actor.userId,
      approved_by_name: actor.fullName,
    })
    .eq("id", id)
    .eq("status", "pending_approval")
    .select("description, amount_kobo, recorded_by_name")
    .maybeSingle();
  if (!expense) return;

  await logStaffActivity(actor, {
    action: approve ? "expense.approve" : "expense.reject",
    entityType: "expense",
    entityId: id,
    summary: `${approve ? "Approved" : "Rejected"} ${expense.recorded_by_name ?? "a"}'s expense ${formatNaira(expense.amount_kobo)} — ${expense.description}`,
  });
  revalidateExpenses();
}

/** Expenses are never deleted — a mistaken entry is voided with a reason
 *  and stays visible (struck through), so the books keep a full trail. */
export async function voidExpense(formData: FormData): Promise<void> {
  let actor: StaffSession;
  try {
    actor = await requireStaffAbility("manage_expenses");
  } catch {
    return;
  }
  const id = formData.get("id") as string;
  const reason = String(formData.get("reason") ?? "").trim();
  if (!id || !reason) return;

  const { data: expense } = await createServiceClient()
    .from("expenses")
    .update({
      voided_at: new Date().toISOString(),
      voided_by: actor.userId,
      voided_by_name: actor.fullName,
      void_reason: reason,
    })
    .eq("id", id)
    .is("voided_at", null)
    .select("description, amount_kobo")
    .maybeSingle();
  if (!expense) return;

  await logStaffActivity(actor, {
    action: "expense.void",
    entityType: "expense",
    entityId: id,
    summary: `Voided expense ${formatNaira(expense.amount_kobo)} — ${expense.description}: ${reason}`,
  });
  revalidateExpenses();
}
