"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function adminLogin(formData: FormData): Promise<{ error?: string }> {
  const password = formData.get("password");
  const next = (formData.get("next") as string | null) || "/admin/products";

  if (typeof password !== "string" || !password) {
    return { error: "Password is required." };
  }

  if (password !== process.env.ADMIN_PASSWORD) {
    return { error: "Incorrect password." };
  }

  // The cookie holds a separate session secret, never the password itself —
  // so reading the cookie value never reveals what was typed to log in.
  const cookieStore = await cookies();
  cookieStore.set("mtj_admin_session", process.env.ADMIN_SESSION_SECRET ?? "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  });

  redirect(next);
}

export async function adminLogout() {
  const cookieStore = await cookies();
  cookieStore.delete("mtj_admin_session");
  redirect("/admin/login");
}
