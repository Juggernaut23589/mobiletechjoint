import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { getPublishedBlogPostBySlug } from "@/lib/blog";
import { BlogBody } from "@/components/BlogBody";

export const revalidate = 60;

const TYPE_LABEL: Record<string, string> = {
  review: "Review",
  upcoming: "Coming Soon",
  article: "Article",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedBlogPostBySlug(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt || undefined,
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPublishedBlogPostBySlug(slug);
  if (!post) notFound();

  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-8 sm:py-16">
      <div className="mb-5 text-[13px] text-ink/50">
        <Link href="/" className="text-link hover:text-ink">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <Link href="/blog" className="text-link hover:text-ink">
          Blog
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink">{post.title}</span>
      </div>

      <span className="mb-3 inline-block rounded-full bg-brand-900 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-accent-400">
        {TYPE_LABEL[post.post_type] ?? post.post_type}
      </span>

      <h1 className="font-display mb-3 text-3xl font-bold leading-tight tracking-tight text-ink sm:text-4xl">
        {post.title}
      </h1>

      <div className="mb-8 flex items-center gap-2 text-sm text-ink/50">
        {post.author_name && <span>{post.author_name}</span>}
        {post.author_name && post.published_at && <span>·</span>}
        {post.published_at && (
          <span>
            {new Date(post.published_at).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}
          </span>
        )}
      </div>

      {post.cover_image_url && (
        <div className="relative mb-8 aspect-[16/9] w-full overflow-hidden rounded-2xl bg-ink/5">
          <Image src={post.cover_image_url} alt={post.title} fill sizes="(min-width: 768px) 768px, 100vw" className="object-cover" priority />
        </div>
      )}

      <BlogBody body={post.body} />

      <div className="mt-12 border-t border-ink/10 pt-6">
        <Link href="/blog" className="text-sm font-semibold text-link hover:underline">
          ← Back to Blog
        </Link>
      </div>
    </article>
  );
}
