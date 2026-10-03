import { createServiceClient } from "@/lib/supabase/server";
import type { StaffSession } from "@/lib/staff-auth";

export type ActivityEntityType =
  | "product"
  | "order"
  | "expense"
  | "staff"
  | "delivery_rate"
  | "cross_sell"
  | "customer";

export type FieldChanges = Record<string, { from: unknown; to: unknown }>;

/** Only the fields whose values actually differ. */
export function diffFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): FieldChanges {
  const changes: FieldChanges = {};
  for (const key of Object.keys(after)) {
    if (before[key] !== after[key]) changes[key] = { from: before[key] ?? null, to: after[key] ?? null };
  }
  return changes;
}

export interface ActivityEntry {
  action: string;
  entityType: ActivityEntityType;
  entityId?: string | null;
  summary: string;
  changes?: FieldChanges | Record<string, unknown> | null;
}

/** Records who did what. Called after the business write has succeeded;
 *  a logging failure is reported but never undoes or blocks that write. */
export async function logStaffActivity(actor: StaffSession, entry: ActivityEntry): Promise<void> {
  await logStaffActivities(actor, [entry]);
}

export async function logStaffActivities(actor: StaffSession, entries: ActivityEntry[]): Promise<void> {
  if (entries.length === 0) return;
  const { error } = await createServiceClient()
    .from("staff_activity_log")
    .insert(
      entries.map((entry) => ({
        staff_id: actor.userId,
        staff_name: actor.fullName,
        action: entry.action,
        entity_type: entry.entityType,
        entity_id: entry.entityId ?? null,
        summary: entry.summary,
        changes: entry.changes ?? null,
      }))
    );
  if (error) console.error("logStaffActivities failed:", error.message);
}
