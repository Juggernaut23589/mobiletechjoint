"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { STAFF_COOKIE_NAME, decodeStaffSession, hasAbility, type StaffSession } from "@/lib/staff-auth";
import { nairaToKobo } from "@/lib/money";

async function assertCanManageExpenses(): Promise<StaffSession> {
  const cookieStore = await cookies();
  const staffCookie = cookieStore.get(STAFF_COOKIE_NAME)?.value;
  const session = staffCookie ? await decodeStaffSession(staffCookie) : null;
  if (!hasAbility(session, "manage_expenses") || !session) throw new Error("Unauthorized");
  return session;
}

/** recorded_by references auth.users, but staff accounts are Supabase
 *  Auth users too (created via admin.createUser at registration) — so the
 *  staff session's userId is a valid auth.users id here, same identity
 *  space the customer account system also lives in. */
export async function addExpense(formData: FormData): Promise<{ error?: string }> {
  let session: StaffSession;
  try {
    session = await assertCanManageExpenses();
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

  const supabase = createServiceClient();
  const { error } = await supabase.from("expenses").insert({
    description,
    amount_kobo: nairaToKobo(amountNaira),
    category: category || null,
    incurred_on: incurredOn || new Date().toISOString().slice(0, 10),
    recorded_by: session.userId,
  });

  if (error) return { error: error.message };

  revalidatePath("/staff/dashboard/expenses");
  revalidatePath("/staff/dashboard/sales");
  return {};
}

/** Void return, not {error?} — invoked directly as a Server Component
 *  <form action>, whose type signature requires void/Promise<void> (see
 *  removeCategoryComplement in admin-crosssells.ts for the same pattern
 *  and reasoning). A failed delete just leaves the row in place. */
export async function deleteExpense(formData: FormData): Promise<void> {
  try {
    await assertCanManageExpenses();
  } catch {
    return;
  }

  const id = formData.get("id") as string;
  if (!id) return;

  const supabase = createServiceClient();
  await supabase.from("expenses").delete().eq("id", id);

  revalidatePath("/staff/dashboard/expenses");
  revalidatePath("/staff/dashboard/sales");
}
