import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getStaffSession } from "@/app/actions/staff-auth";
import { hasAbility } from "@/lib/staff-auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { BlogPost } from "@/types/database";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  review: "Review",
  upcoming: "Coming Soon",
  article: "Article",
};

export default async function BlogAdminPage() {
  const session = await getStaffSession();
  if (!session || !hasAbility(session, "manage_blog")) {
    redirect("/staff/dashboard?error=forbidden");
  }

  const { data } = await createServiceClient()
    .from("blog_posts")
    .select("*")
    .order("created_at", { ascending: false });
  const posts = (data as BlogPost[] | null) ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display mb-1 text-2xl font-bold tracking-tight text-ink">Blog</h1>
          <p className="text-sm text-ink/60">
            Product writeups, reviews, and upcoming-product previews shown on /blog.
          </p>
        </div>
        <Link
          href="/staff/dashboard/blog/new"
          className="rounded-full bg-brand-900 px-4 py-2 text-sm font-semibold text-white"
        >
          New post
        </Link>
      </div>

      {posts.length === 0 ? (
        <p className="text-sm text-ink/60">No posts yet.</p>
      ) : (
        <div className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
          {posts.map((p) => (
            <Link
              key={p.id}
              href={`/staff/dashboard/blog/${p.id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50"
            >
              <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-md bg-neutral-100">
                {p.cover_image_url && <Image src={p.cover_image_url} alt="" fill sizes="64px" className="object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-neutral-900">{p.title}</p>
                <p className="truncate text-xs text-neutral-500">
                  {TYPE_LABEL[p.post_type] ?? p.post_type} · {p.author_name || "No author set"}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  p.status === "published" ? "bg-green-50 text-green-700" : "bg-neutral-100 text-neutral-500"
                }`}
              >
                {p.status === "published" ? "Published" : "Draft"}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
