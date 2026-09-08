"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { nairaToKobo } from "@/lib/money";

/** Every admin Server Action re-checks the session cookie itself — proxy.ts
 *  protects page navigation, but a Server Action can be invoked directly,
 *  so it must not rely on the page-level gate alone. */
async function assertAdmin() {
  const cookieStore = await cookies();
  const value = cookieStore.get("mtj_admin_session")?.value;
  if (!value || value !== process.env.ADMIN_SESSION_SECRET) {
    throw new Error("Unauthorized");
  }
}

export async function publishDraftProduct(formData: FormData): Promise<{ error?: string }> {
  await assertAdmin();

  const productId = formData.get("productId") as string;
  const priceNaira = Number(formData.get("priceNaira"));
  const stockQuantity = Number(formData.get("stockQuantity"));

  if (!productId) return { error: "Missing product." };
  if (!priceNaira || priceNaira <= 0) return { error: "Enter a valid price." };
  if (!Number.isFinite(stockQuantity) || stockQuantity < 0) {
    return { error: "Enter a valid stock quantity." };
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("products")
    .update({
      price_kobo: nairaToKobo(priceNaira),
      stock_quantity: stockQuantity,
      status: "published",
    })
    .eq("id", productId);

  if (error) return { error: error.message };

  revalidatePath("/admin/products");
  revalidatePath("/");
  return {};
}

export async function archiveProduct(formData: FormData): Promise<{ error?: string }> {
  await assertAdmin();
  const productId = formData.get("productId") as string;
  if (!productId) return { error: "Missing product." };

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("products")
    .update({ status: "archived" })
    .eq("id", productId);

  if (error) return { error: error.message };

  revalidatePath("/admin/products");
  return {};
}

/** Toggles the hero-carousel / trending flags. Both are admin-curated, not
 *  computed — there's no order history yet to derive real "hot selling"
 *  data from (see the merchandising migration's comment). */
export async function toggleMerchandisingFlag(formData: FormData): Promise<{ error?: string }> {
  await assertAdmin();
  const productId = formData.get("productId") as string;
  const field = formData.get("field") as string;
  const nextValue = formData.get("nextValue") === "true";

  if (!productId) return { error: "Missing product." };
  if (field !== "is_featured" && field !== "is_trending") {
    return { error: "Invalid field." };
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("products")
    .update({ [field]: nextValue })
    .eq("id", productId);

  if (error) return { error: error.message };

  revalidatePath("/admin/products");
  revalidatePath("/");
  return {};
}
