"use server";

import { cookies } from "next/headers";
import { STAFF_COOKIE_NAME, decodeStaffSession, hasAbility } from "@/lib/staff-auth";
import { sendEmail } from "@/lib/email";

async function assertCanManageDisputes() {
  const cookieStore = await cookies();
  const staffCookie = cookieStore.get(STAFF_COOKIE_NAME)?.value;
  const session = staffCookie ? await decodeStaffSession(staffCookie) : null;
  if (!hasAbility(session, "manage_disputes")) throw new Error("Unauthorized");
}

export async function emailCustomer(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  try {
    await assertCanManageDisputes();
  } catch {
    return { error: "Forbidden." };
  }

  const to = formData.get("to") as string;
  const subject = (formData.get("subject") as string)?.trim();
  const message = (formData.get("message") as string)?.trim();

  if (!to || !subject || !message) {
    return { error: "Subject and message are required." };
  }

  const result = await sendEmail({ to, subject, text: message });
  if (!result.ok) return { error: result.error };

  return { success: true };
}
