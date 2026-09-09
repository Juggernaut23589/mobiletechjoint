"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerAuthClient, createServiceClient } from "@/lib/supabase/server";

export interface AuthResult {
  error?: string;
}

/** Creates the Supabase Auth user, then the app-side profile row (full
 *  name, phone) — done here rather than a DB trigger to keep auth-schema
 *  permissions out of the migrations. */
export async function signUp(formData: FormData): Promise<AuthResult> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!fullName || !email || !password) {
    return { error: "Name, email, and password are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const supabase = await createServerAuthClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) return { error: error.message };
  if (!data.user) return { error: "Could not create your account. Please try again." };

  // Service client here, not the auth client — RLS on customer_profiles has
  // no anon insert policy (default-deny, same pattern as orders/order_items),
  // and this insert is already scoped to the just-created user's own id.
  const service = createServiceClient();
  await service.from("customer_profiles").insert({
    id: data.user.id,
    full_name: fullName,
    phone: phone || null,
  });

  redirect("/account");
}

export async function signIn(formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { error: "Email and password are required." };

  const supabase = await createServerAuthClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: "Incorrect email or password." };

  const next = String(formData.get("next") ?? "/account");
  redirect(next.startsWith("/account") ? next : "/account");
}

export async function signOut(): Promise<void> {
  const supabase = await createServerAuthClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

/** Returns the logged-in customer, or null. Used by account pages/layouts
 *  that need the user but shouldn't redirect themselves — proxy.ts already
 *  handles the redirect for anything under /account. */
export async function getCurrentUser() {
  const supabase = await createServerAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
