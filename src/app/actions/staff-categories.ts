"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireStaffAbility } from "@/lib/staff-session";
import { logStaffActivity } from "@/lib/activity-log";
import type { StaffSession } from "@/lib/staff-auth";

type Result = { error?: string };

function requireCategoryEditor(): Promise<StaffSession> {
  return requireStaffAbility("manage_products");
}

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function revalidateCategories() {
  revalidatePath("/staff/dashboard/categories");
  revalidatePath("/");
  revalidatePath("/category", "layout");
}

/** Lets staff create, rename, and delete product categories directly —
 *  previously this required a developer to run a DB migration for every
 *  change. Deleting a category doesn't delete its products (on delete set
 *  null, see the categories FK in the init migration) — they just become
 *  uncategorized rather than being removed. */
export async function createCategory(formData: FormData): Promise<Result> {
  const actor = await requireCategoryEditor();

  const name = ((formData.get("name") as string) || "").trim();
  if (!name) return { error: "Name is required." };

  const supabase = createServiceClient();
  const baseSlug = slugify(name);
  if (!baseSlug) return { error: "That name doesn't produce a usable URL slug." };

  let slug = baseSlug;
  for (let i = 2; ; i++) {
    const { data: existing } = await supabase.from("categories").select("id").eq("slug", slug).maybeSingle();
    if (!existing) break;
    slug = `${baseSlug}-${i}`;
  }

  const { error } = await supabase.from("categories").insert({ name, slug });
  if (error) return { error: error.message };

  await logStaffActivity(actor, {
    action: "category.create",
    entityType: "category",
    summary: `Created category "${name}"`,
  });
  revalidateCategories();
  return {};
}

export async function renameCategory(formData: FormData): Promise<Result> {
  const actor = await requireCategoryEditor();

  const id = formData.get("id") as string;
  const name = ((formData.get("name") as string) || "").trim();
  if (!id) return { error: "Missing category." };
  if (!name) return { error: "Name is required." };

  const supabase = createServiceClient();
  const { data: before } = await supabase.from("categories").select("name").eq("id", id).maybeSingle();
  if (!before) return { error: "That category no longer exists." };

  const { error } = await supabase.from("categories").update({ name }).eq("id", id);
  if (error) return { error: error.message };

  await logStaffActivity(actor, {
    action: "category.rename",
    entityType: "category",
    entityId: id,
    summary: `Renamed category "${before.name}" to "${name}"`,
  });
  revalidateCategories();
  return {};
}

export async function deleteCategory(formData: FormData): Promise<Result> {
  const actor = await requireCategoryEditor();

  const id = formData.get("id") as string;
  if (!id) return { error: "Missing category." };

  const supabase = createServiceClient();
  const { data: before } = await supabase.from("categories").select("name").eq("id", id).maybeSingle();
  if (!before) return { error: "That category no longer exists." };

  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { error: error.message };

  await logStaffActivity(actor, {
    action: "category.delete",
    entityType: "category",
    entityId: id,
    summary: `Deleted category "${before.name}"`,
  });
  revalidateCategories();
  return {};
}
