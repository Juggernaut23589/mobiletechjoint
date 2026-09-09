"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { STAFF_COOKIE_NAME, decodeStaffSession, hasAbility } from "@/lib/staff-auth";

async function assertAdmin() {
  const cookieStore = await cookies();
  const legacyCookie = cookieStore.get("mtj_admin_session")?.value;
  if (legacyCookie && legacyCookie === process.env.ADMIN_SESSION_SECRET) return;

  const staffCookie = cookieStore.get(STAFF_COOKIE_NAME)?.value;
  const session = staffCookie ? await decodeStaffSession(staffCookie) : null;
  if (!hasAbility(session, "manage_cross_sells")) {
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
  revalidatePath("/staff/dashboard/cross-sells");
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
  revalidatePath("/staff/dashboard/cross-sells");
}
