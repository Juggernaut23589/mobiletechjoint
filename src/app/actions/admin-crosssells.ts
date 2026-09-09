"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";

async function assertAdmin() {
  const cookieStore = await cookies();
  const value = cookieStore.get("mtj_admin_session")?.value;
  if (!value || value !== process.env.ADMIN_SESSION_SECRET) {
    throw new Error("Unauthorized");
  }
}

export async function addCategoryComplement(formData: FormData): Promise<{ error?: string }> {
  await assertAdmin();
  const categoryId = formData.get("categoryId") as string;
  const complementCategoryId = formData.get("complementCategoryId") as string;

  if (!categoryId || !complementCategoryId) return { error: "Pick both categories." };
  if (categoryId === complementCategoryId) return { error: "A category can't complement itself." };

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("category_complements")
    .insert({ category_id: categoryId, complement_category_id: complementCategoryId });

  if (error) {
    return { error: error.code === "23505" ? "That pairing already exists." : error.message };
  }

  revalidatePath("/admin/cross-sells");
  return {};
}

/** Plain void return, not {error?} — this is invoked directly as a Server
 *  Component <form action>, whose type signature requires void/Promise<void>
 *  (unlike the useActionState-driven forms elsewhere in /admin, which run
 *  in Client Components and can surface a returned error). A delete failing
 *  here just leaves the row in place, visible on the next page load. */
export async function removeCategoryComplement(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = formData.get("id") as string;
  if (!id) return;

  const supabase = createServiceClient();
  await supabase.from("category_complements").delete().eq("id", id);

  revalidatePath("/admin/cross-sells");
}
