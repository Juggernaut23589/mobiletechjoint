import { redirect, notFound } from "next/navigation";
import { getStaffSession } from "@/app/actions/staff-auth";
import { hasAbility } from "@/lib/staff-auth";
import { createServiceClient } from "@/lib/supabase/server";
import { BlogPostForm } from "@/components/staff/BlogPostForm";
import { BlogPostDeleteButton } from "@/components/staff/BlogPostDeleteButton";
import type { BlogPost } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function EditBlogPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getStaffSession();
  if (!session || !hasAbility(session, "manage_blog")) {
    redirect("/staff/dashboard?error=forbidden");
  }

  const { id } = await params;
  const { data } = await createServiceClient().from("blog_posts").select("*").eq("id", id).maybeSingle();
  const post = data as BlogPost | null;
  if (!post) notFound();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display mb-1 text-2xl font-bold tracking-tight text-ink">Edit blog post</h1>
          <p className="text-sm text-ink/60">/blog/{post.slug}</p>
        </div>
        <BlogPostDeleteButton id={post.id} title={post.title} />
      </div>
      <BlogPostForm post={post} />
    </div>
  );
}
