"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { getStaffSession } from "@/app/actions/staff-auth";
import type { StaffAbility } from "@/lib/staff-auth";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function requireSuperAdmin() {
  const session = await getStaffSession();
  if (!session || session.isPending || session.role !== "super_admin") {
    throw new Error("Forbidden");
  }
  return createClient(URL, SERVICE);
}

export async function approveStaffMember(formData: FormData): Promise<{ error?: string }> {
  try {
    const client = await requireSuperAdmin();
    const staffId = formData.get("staffId") as string;
    if (!staffId) return { error: "Missing staff member." };

    const { error } = await client
      .from("staff_profiles")
      .update({ is_active: true, is_pending: false })
      .eq("id", staffId);

    if (error) return { error: error.message };
    revalidatePath("/staff/dashboard/team");
    return {};
  } catch {
    return { error: "Forbidden." };
  }
}

export async function deactivateStaffMember(formData: FormData): Promise<{ error?: string }> {
  try {
    const client = await requireSuperAdmin();
    const staffId = formData.get("staffId") as string;
    if (!staffId) return { error: "Missing staff member." };

    const { error } = await client
      .from("staff_profiles")
      .update({ is_active: false })
      .eq("id", staffId);

    if (error) return { error: error.message };
    revalidatePath("/staff/dashboard/team");
    return {};
  } catch {
    return { error: "Forbidden." };
  }
}

export async function updateStaffRole(formData: FormData): Promise<{ error?: string }> {
  try {
    const client = await requireSuperAdmin();
    const staffId = formData.get("staffId") as string;
    const role = formData.get("role") as string;
    if (!staffId) return { error: "Missing staff member." };
    if (!["staff", "super_admin"].includes(role)) return { error: "Invalid role." };

    const { error } = await client.from("staff_profiles").update({ role }).eq("id", staffId);
    if (error) return { error: error.message };
    revalidatePath("/staff/dashboard/team");
    return {};
  } catch {
    return { error: "Forbidden." };
  }
}

/** formData carries one entry per ability checkbox — present (any value)
 *  means granted, absent means revoked. Unchecked HTML checkboxes don't
 *  submit at all, which is exactly the semantics needed here. */
export async function updateStaffAbilities(formData: FormData): Promise<{ error?: string }> {
  try {
    const client = await requireSuperAdmin();
    const staffId = formData.get("staffId") as string;
    if (!staffId) return { error: "Missing staff member." };

    const abilities: Partial<Record<StaffAbility, boolean>> = {};
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("ability_") && value === "on") {
        abilities[key.replace("ability_", "") as StaffAbility] = true;
      }
    }

    const { error } = await client
      .from("staff_profiles")
      .update({ abilities })
      .eq("id", staffId);

    if (error) return { error: error.message };
    revalidatePath("/staff/dashboard/team");
    return {};
  } catch {
    return { error: "Forbidden." };
  }
}
