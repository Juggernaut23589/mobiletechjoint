/**
 * One-time bootstrap: creates the very first super_admin staff account.
 * After this, every other super_admin/staff account is created through
 * the normal flow (self-register at /staff/register, then an existing
 * super_admin approves + grants abilities from /staff/dashboard/team).
 *
 * Reads SUPER_ADMIN_NAME / SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD from
 * the environment rather than argv, so the password never appears in
 * shell history or a process list.
 *
 * Run with: npm run create:super-admin
 */
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const fullName = process.env.SUPER_ADMIN_NAME;
  const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD;

  if (!fullName || !email || !password) {
    console.error("Set SUPER_ADMIN_NAME, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD and re-run.");
    process.exit(1);
  }

  const { data: existing } = await supabase
    .from("staff_profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    console.log(`A staff account already exists for ${email} — promoting to super_admin instead of creating a new one.`);
    const { error } = await supabase
      .from("staff_profiles")
      .update({ role: "super_admin", is_active: true, is_pending: false })
      .eq("id", existing.id);
    if (error) throw error;
    console.log("Done — promoted to super_admin.");
    return;
  }

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (authError || !authData.user) {
    throw authError ?? new Error("Failed to create auth user.");
  }

  const { error: insertError } = await supabase.from("staff_profiles").insert({
    id: authData.user.id,
    full_name: fullName,
    email,
    role: "super_admin",
    is_active: true,
    is_pending: false,
    abilities: {},
  });

  if (insertError) {
    await supabase.auth.admin.deleteUser(authData.user.id);
    throw insertError;
  }

  console.log(`Done — ${email} can now log in at /staff/login as super_admin.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
