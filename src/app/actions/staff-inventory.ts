"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { STAFF_COOKIE_NAME, decodeStaffSession, hasAbility } from "@/lib/staff-auth";

async function assertCanManageInventory() {
  const cookieStore = await cookies();
  const staffCookie = cookieStore.get(STAFF_COOKIE_NAME)?.value;
  const session = staffCookie ? await decodeStaffSession(staffCookie) : null;
  if (!hasAbility(session, "manage_inventory")) throw new Error("Unauthorized");
}

/** Deliberately separate from updateProductDetails (admin-products.ts) —
 *  "manage_inventory" is its own grantable ability, distinct from
 *  "manage_products" (editing images/description/etc), per the explicit
 *  requirement that these be independently assignable. */
export async function updateStockQuantity(formData: FormData): Promise<{ error?: string }> {
  try {
    await assertCanManageInventory();
  } catch {
    return { error: "Forbidden." };
  }

  const productId = formData.get("productId") as string;
  const stockQuantity = Number(formData.get("stockQuantity"));

  if (!productId) return { error: "Missing product." };
  if (!Number.isFinite(stockQuantity) || stockQuantity < 0) {
    return { error: "Enter a valid stock quantity." };
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("products")
    .update({ stock_quantity: stockQuantity })
    .eq("id", productId);

  if (error) return { error: error.message };

  revalidatePath("/staff/dashboard/inventory");
  revalidatePath("/");
  return {};
}
