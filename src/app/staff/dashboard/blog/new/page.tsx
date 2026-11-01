import { redirect } from "next/navigation";
import { getStaffSession } from "@/app/actions/staff-auth";
import { hasAbility } from "@/lib/staff-auth";
import { BlogPostForm } from "@/components/staff/BlogPostForm";

export default async function NewBlogPostPage() {
  const session = await getStaffSession();
  if (!session || !hasAbility(session, "manage_blog")) {
    redirect("/staff/dashboard?error=forbidden");
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display mb-1 text-2xl font-bold tracking-tight text-ink">New blog post</h1>
        <p className="text-sm text-ink/60">Save as a draft to keep working on it, or publish right away.</p>
      </div>
      <BlogPostForm />
    </div>
  );
}
