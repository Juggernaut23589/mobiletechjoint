import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedBlogPosts } from "@/lib/blog";
import { BlogPostCard } from "@/components/BlogPostCard";
import type { BlogPostType } from "@/types/database";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Blog",
  description: "Product writeups, reviews, and upcoming-product previews from MobileTechJoint.",
};

const FILTERS: { value: BlogPostType | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "review", label: "Reviews" },
  { value: "upcoming", label: "Coming Soon" },
  { value: "article", label: "Articles" },
];

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const postType = (["review", "upcoming", "article"] as const).includes(type as BlogPostType)
    ? (type as BlogPostType)
    : undefined;

  const posts = await getPublishedBlogPosts({ postType });

  return (
    <div className="mx-auto max-w-[1360px] px-4 py-12 sm:px-8 sm:py-16">
      <div className="mb-8">
        <h1 className="font-display mb-2 text-3xl font-bold tracking-tight text-ink">Blog</h1>
        <p className="max-w-xl text-[15px] leading-relaxed text-ink/60">
          Writeups and reviews on the gear we stock, plus a first look at what&apos;s coming next.
        </p>
      </div>

      <div className="mb-8 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = (postType ?? "all") === f.value;
          const href = f.value === "all" ? "/blog" : `/blog?type=${f.value}`;
          return (
            <Link
              key={f.value}
              href={href}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                active
                  ? "border-accent-500 bg-accent-500/15 font-semibold text-link"
                  : "border-ink/15 text-ink/75 hover:border-accent-500/50 hover:text-ink"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {posts.length === 0 ? (
        <p className="text-sm text-ink/60">
          {postType ? "Nothing in this category yet — check back soon." : "No posts yet — check back soon."}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <BlogPostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
