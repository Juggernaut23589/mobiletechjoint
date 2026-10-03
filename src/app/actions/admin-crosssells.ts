"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireStaffAbility } from "@/lib/staff-session";
import { logStaffActivity } from "@/lib/activity-log";

async function categoryNames(ids: string[]): Promise<Map<string, string>> {
  const { data } = await createServiceClient().from("categories").select("id, name").in("id", ids);
  return new Map((data ?? []).map((c) => [c.id, c.name]));
}

export async function addCategoryComplement(formData: FormData): Promise<{ error?: string }> {
  const actor = await requireStaffAbility("manage_cross_sells");
  const categoryId = formData.get("categoryId") as string;
  const complementCategoryId = formData.get("complementCategoryId") as string;

  if (!categoryId || !complementCategoryId) return { error: "Pick both categories." };
  if (categoryId === complementCategoryId) return { error: "A category can't complement itself." };

  const { data, error } = await createServiceClient()
    .from("category_complements")
    .insert({ category_id: categoryId, complement_category_id: complementCategoryId })
    .select("id")
    .single();

  if (error) {
    return { error: error.code === "23505" ? "That pairing already exists." : error.message };
  }

  const names = await categoryNames([categoryId, complementCategoryId]);
  await logStaffActivity(actor, {
    action: "cross_sell.add",
    entityType: "cross_sell",
    entityId: data.id,
    summary: `Cross-sell added: ${names.get(categoryId)} → ${names.get(complementCategoryId)}`,
  });

  revalidatePath("/staff/dashboard/cross-sells");
  return {};
}

/** Plain void return, not {error?} — this is invoked directly as a Server
 *  Component <form action>, whose type signature requires void/Promise<void>.
 *  A delete failing here just leaves the row in place, visible on the next
 *  page load. */
export async function removeCategoryComplement(formData: FormData): Promise<void> {
  const actor = await requireStaffAbility("manage_cross_sells");
  const id = formData.get("id") as string;
  if (!id) return;

  const supabase = createServiceClient();
  const { data: pairing } = await supabase
    .from("category_complements")
    .select("category_id, complement_category_id")
    .eq("id", id)
    .maybeSingle();
  if (!pairing) return;

  const { error } = await supabase.from("category_complements").delete().eq("id", id);
  if (error) return;

  const names = await categoryNames([pairing.category_id, pairing.complement_category_id]);
  await logStaffActivity(actor, {
    action: "cross_sell.remove",
    entityType: "cross_sell",
    entityId: id,
    summary: `Cross-sell removed: ${names.get(pairing.category_id)} → ${names.get(pairing.complement_category_id)}`,
  });

  revalidatePath("/staff/dashboard/cross-sells");
}
