"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireStaffAbility } from "@/lib/staff-session";
import { logStaffActivity } from "@/lib/activity-log";
import type { StaffSession } from "@/lib/staff-auth";

async function moderate(
  id: string,
  status: "approved" | "rejected",
  note: string | null
): Promise<void> {
  let actor: StaffSession;
  try {
    actor = await requireStaffAbility("manage_reviews");
  } catch {
    return;
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("product_reviews")
    .update({
      status,
      moderated_by: actor.fullName,
      moderated_at: new Date().toISOString(),
      moderation_note: note,
    })
    .eq("id", id)
    .select("id, reviewer_name, product_id, products(slug, name)")
    .single();

  if (error || !data) return;

  await logStaffActivity(actor, {
    action: status === "approved" ? "review.approve" : "review.reject",
    entityType: "product_review",
    entityId: id,
    summary: `${status === "approved" ? "Approved" : "Rejected"} ${data.reviewer_name}'s review of ${
      (data.products as unknown as { name: string } | null)?.name ?? "a product"
    }`,
  });

  revalidatePath("/staff/dashboard/reviews");
  const slug = (data.products as unknown as { slug: string } | null)?.slug;
  if (slug) revalidatePath(`/products/${slug}`);
}

export async function approveReview(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (id) await moderate(id, "approved", null);
}

export async function rejectReview(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;
  if (id) await moderate(id, "rejected", note);
}
