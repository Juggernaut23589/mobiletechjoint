"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerAuthClient, createServiceClient } from "@/lib/supabase/server";

export interface AuthResult {
  error?: string;
  notice?: string;
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

/** Updates the logged-in customer's own profile row. Email is deliberately
 *  not editable here — changing it means re-verifying a new address via
 *  Supabase Auth, a different flow from a plain profile field edit. */
export async function updateProfile(_prev: AuthResult, formData: FormData): Promise<AuthResult> {
  const authClient = await createServerAuthClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) return { error: "Please log in." };

  const fullName = String(formData.get("fullName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const gender = String(formData.get("gender") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const ageRaw = String(formData.get("age") ?? "").trim();

  if (!fullName) return { error: "Enter your name." };

  let age: number | null = null;
  if (ageRaw) {
    const parsed = Number(ageRaw);
    if (!Number.isInteger(parsed) || parsed < 13 || parsed > 120) {
      return { error: "Age must be a whole number between 13 and 120." };
    }
    age = parsed;
  }

  const { error } = await createServiceClient()
    .from("customer_profiles")
    .update({
      full_name: fullName,
      phone: phone || null,
      gender: gender || null,
      address: address || null,
      age,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/account");
  revalidatePath("/account/profile");
  return { notice: "Saved." };
}
