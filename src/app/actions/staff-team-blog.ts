"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireStaffAbility } from "@/lib/staff-session";
import { logStaffActivity } from "@/lib/activity-log";
import type { StaffSession } from "@/lib/staff-auth";

type Result = { error?: string; notice?: string; id?: string };

function requireTeamBlogEditor(): Promise<StaffSession> {
  return requireStaffAbility("manage_content");
}

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function parseCurates(raw: FormDataEntryValue | null): { label: string; href: string }[] | "invalid" {
  const s = String(raw ?? "").trim();
  if (!s) return [];
  const links: { label: string; href: string }[] = [];
  for (const line of s.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const [label, href] = trimmed.split("|").map((p) => p.trim());
    if (!label || !href) return "invalid";
    links.push({ label, href });
  }
  return links;
}

function revalidateTeamBlog() {
  revalidatePath("/staff/dashboard/team-blog");
  revalidatePath("/");
  revalidatePath("/team");
}

export async function createTeamMember(_prev: Result, formData: FormData): Promise<Result> {
  let actor: StaffSession;
  try {
    actor = await requireTeamBlogEditor();
  } catch {
    return { error: "Forbidden." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();
  if (!name) return { error: "Enter a name." };
  if (!role) return { error: "Enter a role." };

  const curates = parseCurates(formData.get("curates"));
  if (curates === "invalid") {
    return { error: "Each curated link needs a label and href separated by \"|\", one per line." };
  }

  const row = {
    slug: slugify(name),
    name,
    role,
    tagline: String(formData.get("tagline") ?? "").trim(),
    quote: String(formData.get("quote") ?? "").trim(),
    bio: String(formData.get("bio") ?? "").trim(),
    curates,
    position: Number(formData.get("position") ?? 0) || 0,
    is_published: formData.get("isPublished") === "true",
  };

  const { data, error } = await createServiceClient()
    .from("team_members")
    .insert(row)
    .select("id")
    .single();
  if (error) return { error: error.code === "23505" ? "That name produces a slug already in use." : error.message };

  await logStaffActivity(actor, {
    action: "team_member.create",
    entityType: "team_member",
    entityId: data.id,
    summary: `Added team profile for ${name} (${role})`,
    changes: row,
  });
  revalidateTeamBlog();
  return { notice: "Created.", id: data.id };
}

export async function updateTeamMember(_prev: Result, formData: FormData): Promise<Result> {
  let actor: StaffSession;
  try {
    actor = await requireTeamBlogEditor();
  } catch {
    return { error: "Forbidden." };
  }

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing profile." };

  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();
  if (!name) return { error: "Enter a name." };
  if (!role) return { error: "Enter a role." };

  const curates = parseCurates(formData.get("curates"));
  if (curates === "invalid") {
    return { error: "Each curated link needs a label and href separated by \"|\", one per line." };
  }

  const row = {
    name,
    role,
    tagline: String(formData.get("tagline") ?? "").trim(),
    quote: String(formData.get("quote") ?? "").trim(),
    bio: String(formData.get("bio") ?? "").trim(),
    curates,
    position: Number(formData.get("position") ?? 0) || 0,
    is_published: formData.get("isPublished") === "true",
  };

  const { data, error } = await createServiceClient()
    .from("team_members")
    .update(row)
    .eq("id", id)
    .select("slug")
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "That profile no longer exists." };

  await logStaffActivity(actor, {
    action: "team_member.update",
    entityType: "team_member",
    entityId: id,
    summary: `Updated team profile for ${name} (${role})`,
    changes: row,
  });
  revalidateTeamBlog();
  revalidatePath(`/team/${data.slug}`);
  return { notice: "Saved." };
}

export async function deleteTeamMember(formData: FormData): Promise<void> {
  let actor: StaffSession;
  try {
    actor = await requireTeamBlogEditor();
  } catch {
    return;
  }
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createServiceClient();
  const { data } = await supabase.from("team_members").select("name, photo_url").eq("id", id).maybeSingle();
  if (!data) return;

  await supabase.from("team_members").delete().eq("id", id);

  // Best-effort: also remove the uploaded photo, not just the DB row.
  const marker = "/team-media/";
  const idx = data.photo_url?.indexOf(marker) ?? -1;
  if (idx !== -1 && data.photo_url) {
    await supabase.storage.from("team-media").remove([data.photo_url.slice(idx + marker.length)]);
  }

  await logStaffActivity(actor, {
    action: "team_member.delete",
    entityType: "team_member",
    entityId: id,
    summary: `Removed team profile for ${data.name}`,
  });
  revalidateTeamBlog();
}

/** Uploads a new portrait for a team profile to the "team-media" Storage
 *  bucket, mirroring the pattern uploadProductImage already uses for
 *  product photos (admin-products.ts). */
export async function uploadTeamMemberPhoto(formData: FormData): Promise<{ error?: string }> {
  const actor = await requireTeamBlogEditor();

  const id = formData.get("id") as string;
  const file = formData.get("file") as File | null;
  if (!id) return { error: "Missing profile." };
  if (!file || file.size === 0) return { error: "Choose a photo first." };

  const supabase = createServiceClient();
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `team/${id}/${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("team-media")
    .upload(path, buffer, { contentType: file.type || undefined });
  if (uploadError) return { error: uploadError.message };

  const { data: publicUrlData } = supabase.storage.from("team-media").getPublicUrl(path);

  const { data, error } = await supabase
    .from("team_members")
    .update({ photo_url: publicUrlData.publicUrl })
    .eq("id", id)
    .select("name, slug")
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "That profile no longer exists." };

  await logStaffActivity(actor, {
    action: "team_member.photo",
    entityType: "team_member",
    entityId: id,
    summary: `Updated photo for ${data.name}`,
  });
  revalidateTeamBlog();
  revalidatePath(`/team/${data.slug}`);
  return {};
}
