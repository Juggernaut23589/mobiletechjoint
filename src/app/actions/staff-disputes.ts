"use server";

import { requireStaffAbility } from "@/lib/staff-session";
import { logStaffActivity } from "@/lib/activity-log";
import { sendEmail } from "@/lib/email";
import type { StaffSession } from "@/lib/staff-auth";

export async function emailCustomer(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  let actor: StaffSession;
  try {
    actor = await requireStaffAbility("manage_disputes");
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

  await logStaffActivity(actor, {
    action: "customer.email",
    entityType: "customer",
    entityId: to,
    summary: `Emailed ${to}: "${subject}"`,
  });
  return { success: true };
}
