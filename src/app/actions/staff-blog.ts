"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireStaffAbility } from "@/lib/staff-session";
import { logStaffActivity } from "@/lib/activity-log";
import type { StaffSession } from "@/lib/staff-auth";
import type { BlogPostType } from "@/types/database";

type Result = { error?: string; notice?: string; id?: string };

function requireBlogEditor(): Promise<StaffSession> {
  return requireStaffAbility("manage_blog");
}

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function revalidateBlog(slug?: string) {
  revalidatePath("/staff/dashboard/blog");
  revalidatePath("/blog");
  if (slug) revalidatePath(`/blog/${slug}`);
}

async function uploadCoverImage(
  supabase: ReturnType<typeof createServiceClient>,
  postId: string,
  file: File
): Promise<{ url?: string; error?: string }> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${postId}/cover-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("blog-media")
    .upload(path, buffer, { contentType: file.type || undefined });
  if (uploadError) return { error: uploadError.message };

  const { data } = supabase.storage.from("blog-media").getPublicUrl(path);
  return { url: data.publicUrl };
}

export async function createBlogPost(_prev: Result, formData: FormData): Promise<Result> {
  let actor: StaffSession;
  try {
    actor = await requireBlogEditor();
  } catch {
    return { error: "Forbidden." };
  }

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Enter a title." };

  const postType = String(formData.get("postType") ?? "article") as BlogPostType;
  if (!["review", "upcoming", "article"].includes(postType)) return { error: "Invalid post type." };

  const status = formData.get("status") === "published" ? "published" : "draft";
  const supabase = createServiceClient();

  const baseSlug = slugify(title);
  if (!baseSlug) return { error: "That title doesn't produce a usable URL slug." };
  let slug = baseSlug;
  for (let i = 2; ; i++) {
    const { data: existing } = await supabase.from("blog_posts").select("id").eq("slug", slug).maybeSingle();
    if (!existing) break;
    slug = `${baseSlug}-${i}`;
  }

  const row = {
    slug,
    title,
    excerpt: String(formData.get("excerpt") ?? "").trim(),
    post_type: postType,
    author_name: String(formData.get("authorName") ?? "").trim(),
    body: String(formData.get("body") ?? "").trim(),
    status,
    published_at: status === "published" ? new Date().toISOString() : null,
  };

  const { data, error } = await supabase.from("blog_posts").insert(row).select("id").single();
  if (error) return { error: error.message };

  const coverImage = formData.get("coverImage") as File | null;
  if (coverImage && coverImage.size > 0) {
    const { url, error: uploadError } = await uploadCoverImage(supabase, data.id, coverImage);
    if (uploadError) return { error: `Post created, but the cover image failed: ${uploadError}`, id: data.id };
    if (url) await supabase.from("blog_posts").update({ cover_image_url: url }).eq("id", data.id);
  }

  await logStaffActivity(actor, {
    action: "blog_post.create",
    entityType: "blog_post",
    entityId: data.id,
    summary: `Created blog post "${title}" (${status})`,
  });
  revalidateBlog(slug);
  return { notice: "Created.", id: data.id };
}

export async function updateBlogPost(_prev: Result, formData: FormData): Promise<Result> {
  let actor: StaffSession;
  try {
    actor = await requireBlogEditor();
  } catch {
    return { error: "Forbidden." };
  }

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing post." };

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Enter a title." };

  const postType = String(formData.get("postType") ?? "article") as BlogPostType;
  if (!["review", "upcoming", "article"].includes(postType)) return { error: "Invalid post type." };

  const status = formData.get("status") === "published" ? "published" : "draft";
  const supabase = createServiceClient();

  const { data: before } = await supabase
    .from("blog_posts")
    .select("slug, status, published_at")
    .eq("id", id)
    .maybeSingle();
  if (!before) return { error: "That post no longer exists." };

  const row = {
    title,
    excerpt: String(formData.get("excerpt") ?? "").trim(),
    post_type: postType,
    author_name: String(formData.get("authorName") ?? "").trim(),
    body: String(formData.get("body") ?? "").trim(),
    status,
    // A draft being published for the first time gets "now"; an already-
    // published post keeps its original published_at so re-saving a live
    // post doesn't bump it back to the top of the blog as if it were new.
    published_at: status === "published" ? (before.published_at ?? new Date().toISOString()) : before.published_at,
  };

  const { error } = await supabase.from("blog_posts").update(row).eq("id", id);
  if (error) return { error: error.message };

  const coverImage = formData.get("coverImage") as File | null;
  if (coverImage && coverImage.size > 0) {
    const { url, error: uploadError } = await uploadCoverImage(supabase, id, coverImage);
    if (uploadError) return { error: `Saved, but the cover image failed: ${uploadError}` };
    if (url) await supabase.from("blog_posts").update({ cover_image_url: url }).eq("id", id);
  }

  await logStaffActivity(actor, {
    action: "blog_post.update",
    entityType: "blog_post",
    entityId: id,
    summary: `Updated blog post "${title}"`,
  });
  revalidateBlog(before.slug);
  return { notice: "Saved." };
}

export async function deleteBlogPost(formData: FormData): Promise<void> {
  let actor: StaffSession;
  try {
    actor = await requireBlogEditor();
  } catch {
    return;
  }
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createServiceClient();
  const { data } = await supabase.from("blog_posts").select("title, slug, cover_image_url").eq("id", id).maybeSingle();
  if (!data) return;

  await supabase.from("blog_posts").delete().eq("id", id);

  // Best-effort cleanup of everything uploaded under this post's folder
  // in the bucket (cover image, any body images uploaded via
  // uploadBlogBodyImage below), not just the DB row.
  const { data: files } = await supabase.storage.from("blog-media").list(id);
  if (files && files.length > 0) {
    await supabase.storage.from("blog-media").remove(files.map((f) => `${id}/${f.name}`));
  }

  await logStaffActivity(actor, {
    action: "blog_post.delete",
    entityType: "blog_post",
    entityId: id,
    summary: `Deleted blog post "${data.title}"`,
  });
  revalidateBlog(data.slug);
}

/** Uploads an image to attach inside a post's body — the editor inserts
 *  the resulting URL as an `IMAGE: <url>` line (see parseBlogBody). Scoped
 *  under the post's own folder in the bucket so deleteBlogPost's
 *  best-effort cleanup above catches it. */
export async function uploadBlogBodyImage(formData: FormData): Promise<{ url?: string; error?: string }> {
  await requireBlogEditor();

  const postId = (formData.get("postId") as string) || "drafts";
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "Choose an image first." };

  const supabase = createServiceClient();
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${postId}/body-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("blog-media")
    .upload(path, buffer, { contentType: file.type || undefined });
  if (uploadError) return { error: uploadError.message };

  const { data } = supabase.storage.from("blog-media").getPublicUrl(path);
  return { url: data.publicUrl };
}
