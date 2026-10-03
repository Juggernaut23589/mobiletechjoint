"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import {
  encodeStaffSession,
  decodeStaffInvite,
  STAFF_COOKIE_NAME,
  STAFF_COOKIE_MAX_AGE,
  type StaffRole,
} from "@/lib/staff-auth";
import { getVerifiedStaffSession } from "@/lib/staff-session";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export interface StaffAuthResult {
  error?: string;
  success?: boolean;
}

/** Invite-only registration: requires a signed invite link minted by a
 *  super_admin from Team, and the email must match the invite. Still lands
 *  as role='staff', is_pending=true, abilities={} — the super_admin then
 *  approves and grants abilities from /staff/dashboard/team. */
export async function registerStaff(
  _prev: StaffAuthResult,
  formData: FormData
): Promise<StaffAuthResult> {
  const invite = await decodeStaffInvite(String(formData.get("invite") ?? ""));
  if (!invite) {
    return { error: "This invite link is invalid or has expired. Ask an admin for a new one." };
  }

  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = invite.email.trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const phone = String(formData.get("phone") ?? "").trim();
  const jobTitle = String(formData.get("jobTitle") ?? "").trim();

  if (!fullName || !password || !jobTitle) {
    return { error: "Name, email, password, and job title are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const adminClient = createClient(URL, SERVICE);

  const { data: existing } = await adminClient
    .from("staff_profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (existing) return { error: "An account with this email already exists." };

  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (authError || !authData.user) {
    return { error: authError?.message ?? "Could not create your account." };
  }

  const { error: insertError } = await adminClient.from("staff_profiles").insert({
    id: authData.user.id,
    full_name: fullName,
    email,
    phone: phone || null,
    job_title: jobTitle,
    role: "staff",
    is_active: false,
    is_pending: true,
    abilities: {},
  });

  if (insertError) {
    // Roll back the auth user so a failed registration doesn't leave an
    // orphaned login with no profile.
    await adminClient.auth.admin.deleteUser(authData.user.id);
    return { error: "Could not create your staff profile. Please try again." };
  }

  return { success: true };
}

export async function loginStaff(
  _prev: StaffAuthResult,
  formData: FormData
): Promise<StaffAuthResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { error: "Email and password are required." };

  const anonClient = createClient(URL, ANON);
  const { data: authData, error: authError } = await anonClient.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.user) {
    return { error: "Incorrect email or password." };
  }

  const adminClient = createClient(URL, SERVICE);
  const { data: staff } = await adminClient
    .from("staff_profiles")
    .select("id, full_name, email, role, is_active, is_pending, abilities")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (!staff) {
    return { error: "No staff account found for this email." };
  }

  const token = await encodeStaffSession({
    userId: staff.id,
    email: staff.email,
    fullName: staff.full_name,
    role: staff.role as StaffRole,
    abilities: staff.abilities ?? {},
    isPending: staff.is_pending || !staff.is_active,
  });

  const cookieStore = await cookies();
  cookieStore.set(STAFF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: STAFF_COOKIE_MAX_AGE,
    path: "/",
  });

  redirect("/staff/dashboard");
}

export async function logoutStaff() {
  const cookieStore = await cookies();
  cookieStore.delete(STAFF_COOKIE_NAME);
  redirect("/staff/login");
}

export async function getStaffSession() {
  return getVerifiedStaffSession();
}
