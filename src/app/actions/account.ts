"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { createServerAuthClient, createServiceClient } from "@/lib/supabase/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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

/** Emails a password-reset link via Supabase Auth's own mailer. Always
 *  returns the same notice regardless of whether the email has an account,
 *  so this form can't be used to discover who's registered — same pattern
 *  as the staff password reset (app/actions/staff-auth.ts). */
export async function requestAccountPasswordReset(
  _prev: AuthResult,
  formData: FormData
): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address." };

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;

  // Implicit flow: the link lands on /account/reset-password with the
  // session in the URL fragment, which never reaches any server log.
  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false },
  });
  const { error } = await anonClient.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/account/reset-password`,
  });

  if (error) {
    console.error("Account password reset email failed:", error.message);
    if (/rate limit/i.test(error.message)) {
      return { error: "Too many reset emails have been sent recently. Please try again in an hour." };
    }
  }

  return { notice: "If that email has an account, a reset link is on its way. It expires in one hour — check your spam folder if it doesn't arrive." };
}

/** Second half of the reset: the page passes the access token from the
 *  emailed link. Supabase verifies it; only then is the password changed,
 *  and that link's session is revoked so it can't be reused. */
export async function completeAccountPasswordReset(
  _prev: AuthResult,
  formData: FormData
): Promise<AuthResult> {
  const accessToken = String(formData.get("accessToken") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (password !== confirm) return { error: "The two passwords don't match." };

  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await anonClient.auth.getUser(accessToken);
  if (error || !data.user) {
    return { error: "This reset link has expired or was already used. Request a new one." };
  }

  const service = createServiceClient();
  const { error: updateError } = await service.auth.admin.updateUserById(data.user.id, { password });
  if (updateError) return { error: updateError.message };
  await service.auth.admin.signOut(accessToken);

  return { notice: "Your password has been changed." };
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
