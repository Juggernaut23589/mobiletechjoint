"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireSuperAdmin } from "@/lib/staff-session";
import { logStaffActivity } from "@/lib/activity-log";
import { sendEmail } from "@/lib/email";
import {
  encodeStaffInvite,
  STAFF_ABILITIES,
  STAFF_INVITE_TTL_MS,
  type StaffAbility,
  type StaffSession,
} from "@/lib/staff-auth";

type Result = { error?: string };

async function superAdminOrError(): Promise<StaffSession | null> {
  try {
    return await requireSuperAdmin();
  } catch {
    return null;
  }
}

async function getMember(staffId: string) {
  const { data } = await createServiceClient()
    .from("staff_profiles")
    .select("id, full_name, email, role, is_active, is_pending, abilities")
    .eq("id", staffId)
    .maybeSingle();
  return data;
}

export async function createStaffInvite(
  _prev: { error?: string; link?: string; emailed?: boolean },
  formData: FormData
): Promise<{ error?: string; link?: string; emailed?: boolean }> {
  const actor = await superAdminOrError();
  if (!actor) return { error: "Forbidden." };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address." };

  const { data: existing } = await createServiceClient()
    .from("staff_profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (existing) return { error: "That email already has a staff account." };

  const token = await encodeStaffInvite({
    email,
    invitedBy: actor.userId,
    expiresAt: Date.now() + STAFF_INVITE_TTL_MS,
  });
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://mobiletechjoint.com";
  const link = `${baseUrl}/staff/register?invite=${encodeURIComponent(token)}`;

  const sent = await sendEmail({
    to: email,
    subject: "You've been invited to the MobileTechJoint staff dashboard",
    text: `${actor.fullName} has invited you to join the MobileTechJoint staff dashboard.\n\nCreate your account here (link expires in 7 days):\n${link}\n\nAfter you register, an admin will approve your account and set your access.`,
  });

  await logStaffActivity(actor, {
    action: "staff.invite",
    entityType: "staff",
    summary: `Invited ${email} to join the staff dashboard`,
  });

  return { link, emailed: sent.ok };
}

export async function approveStaffMember(formData: FormData): Promise<Result> {
  const actor = await superAdminOrError();
  if (!actor) return { error: "Forbidden." };
  const staffId = formData.get("staffId") as string;
  const member = staffId ? await getMember(staffId) : null;
  if (!member) return { error: "Missing staff member." };

  const { error } = await createServiceClient()
    .from("staff_profiles")
    .update({ is_active: true, is_pending: false })
    .eq("id", staffId);
  if (error) return { error: error.message };

  await logStaffActivity(actor, {
    action: "staff.approve",
    entityType: "staff",
    entityId: staffId,
    summary: `Approved ${member.full_name} (${member.email})`,
  });
  revalidatePath("/staff/dashboard/team");
  return {};
}

/** Removes a registration that was never approved (e.g. a sign-up the
 *  admin doesn't recognise). Only pending accounts can be rejected —
 *  approved staff are deactivated instead, which keeps their history. */
export async function rejectStaffRegistration(formData: FormData): Promise<Result> {
  const actor = await superAdminOrError();
  if (!actor) return { error: "Forbidden." };
  const staffId = formData.get("staffId") as string;
  const member = staffId ? await getMember(staffId) : null;
  if (!member) return { error: "Missing staff member." };
  if (!member.is_pending) return { error: "Only pending registrations can be rejected." };

  const supabase = createServiceClient();
  const { error } = await supabase.from("staff_profiles").delete().eq("id", staffId);
  if (error) return { error: error.message };
  await supabase.auth.admin.deleteUser(staffId);

  await logStaffActivity(actor, {
    action: "staff.reject",
    entityType: "staff",
    entityId: staffId,
    summary: `Rejected pending registration from ${member.full_name} (${member.email})`,
  });
  revalidatePath("/staff/dashboard/team");
  return {};
}

export async function setStaffActive(formData: FormData): Promise<Result> {
  const actor = await superAdminOrError();
  if (!actor) return { error: "Forbidden." };
  const staffId = formData.get("staffId") as string;
  const isActive = formData.get("isActive") === "true";
  if (staffId === actor.userId) return { error: "You can't deactivate yourself." };
  const member = staffId ? await getMember(staffId) : null;
  if (!member) return { error: "Missing staff member." };

  const { error } = await createServiceClient()
    .from("staff_profiles")
    .update({ is_active: isActive })
    .eq("id", staffId);
  if (error) return { error: error.message };

  await logStaffActivity(actor, {
    action: isActive ? "staff.reactivate" : "staff.deactivate",
    entityType: "staff",
    entityId: staffId,
    summary: `${isActive ? "Reactivated" : "Deactivated"} ${member.full_name}`,
  });
  revalidatePath("/staff/dashboard/team");
  return {};
}

export async function updateStaffRole(formData: FormData): Promise<Result> {
  const actor = await superAdminOrError();
  if (!actor) return { error: "Forbidden." };
  const staffId = formData.get("staffId") as string;
  const role = formData.get("role") as string;
  if (!["staff", "super_admin"].includes(role)) return { error: "Invalid role." };
  if (staffId === actor.userId) return { error: "You can't change your own role." };
  const member = staffId ? await getMember(staffId) : null;
  if (!member) return { error: "Missing staff member." };

  const { error } = await createServiceClient()
    .from("staff_profiles")
    .update({ role })
    .eq("id", staffId);
  if (error) return { error: error.message };

  await logStaffActivity(actor, {
    action: "staff.role",
    entityType: "staff",
    entityId: staffId,
    summary: `Changed ${member.full_name}'s role from ${member.role} to ${role}`,
    changes: { role: { from: member.role, to: role } },
  });
  revalidatePath("/staff/dashboard/team");
  return {};
}

/** formData carries one entry per ability checkbox — present (any value)
 *  means granted, absent means revoked. Unchecked HTML checkboxes don't
 *  submit at all, which is exactly the semantics needed here. */
export async function updateStaffAbilities(formData: FormData): Promise<Result> {
  const actor = await superAdminOrError();
  if (!actor) return { error: "Forbidden." };
  const staffId = formData.get("staffId") as string;
  const member = staffId ? await getMember(staffId) : null;
  if (!member) return { error: "Missing staff member." };

  const abilities: Partial<Record<StaffAbility, boolean>> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("ability_") && value === "on") {
      abilities[key.replace("ability_", "") as StaffAbility] = true;
    }
  }

  const { error } = await createServiceClient()
    .from("staff_profiles")
    .update({ abilities })
    .eq("id", staffId);
  if (error) return { error: error.message };

  const before = (member.abilities ?? {}) as Partial<Record<StaffAbility, boolean>>;
  const label = (key: StaffAbility) => STAFF_ABILITIES.find((a) => a.key === key)?.label ?? key;
  const granted = STAFF_ABILITIES.filter((a) => abilities[a.key] && !before[a.key]).map((a) => label(a.key));
  const revoked = STAFF_ABILITIES.filter((a) => !abilities[a.key] && before[a.key]).map((a) => label(a.key));
  if (granted.length || revoked.length) {
    await logStaffActivity(actor, {
      action: "staff.abilities",
      entityType: "staff",
      entityId: staffId,
      summary: `Updated ${member.full_name}'s access${granted.length ? ` — granted ${granted.join(", ")}` : ""}${revoked.length ? ` — revoked ${revoked.join(", ")}` : ""}`,
      changes: { granted, revoked },
    });
  }
  revalidatePath("/staff/dashboard/team");
  return {};
}
