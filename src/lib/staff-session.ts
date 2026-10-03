import { cache } from "react";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";
import {
  STAFF_COOKIE_NAME,
  decodeStaffSession,
  hasAbility,
  type StaffAbility,
  type StaffRole,
  type StaffSession,
} from "@/lib/staff-auth";

/** The signed cookie only proves *who* is calling. Role, abilities and
 *  active/pending status are re-read from staff_profiles on every request,
 *  so deactivating someone or removing an ability takes effect on their
 *  very next click instead of when their 7-day cookie expires.
 *  cache() dedupes the lookup across layout + page + actions in one request. */
export const getVerifiedStaffSession = cache(async (): Promise<StaffSession | null> => {
  const token = (await cookies()).get(STAFF_COOKIE_NAME)?.value;
  if (!token) return null;
  const decoded = await decodeStaffSession(token);
  if (!decoded) return null;

  const { data: staff } = await createServiceClient()
    .from("staff_profiles")
    .select("id, full_name, email, role, is_active, is_pending, abilities")
    .eq("id", decoded.userId)
    .maybeSingle();
  if (!staff) return null;

  return {
    userId: staff.id,
    email: staff.email,
    fullName: staff.full_name,
    role: staff.role as StaffRole,
    abilities: staff.abilities ?? {},
    isPending: staff.is_pending || !staff.is_active,
  };
});

export async function requireStaffAbility(ability: StaffAbility): Promise<StaffSession> {
  const session = await getVerifiedStaffSession();
  if (!session || !hasAbility(session, ability)) throw new Error("Unauthorized");
  return session;
}

export async function requireAnyStaffAbility(abilities: StaffAbility[]): Promise<StaffSession> {
  const session = await getVerifiedStaffSession();
  if (!session || !abilities.some((a) => hasAbility(session, a))) throw new Error("Unauthorized");
  return session;
}

export async function requireSuperAdmin(): Promise<StaffSession> {
  const session = await getVerifiedStaffSession();
  if (!session || session.isPending || session.role !== "super_admin") {
    throw new Error("Forbidden");
  }
  return session;
}
