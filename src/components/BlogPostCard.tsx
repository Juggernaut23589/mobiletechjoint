import Link from "next/link";
import Image from "next/image";
import type { BlogPostSummary } from "@/lib/blog";

const TYPE_LABEL: Record<string, string> = {
  review: "Review",
  upcoming: "Coming Soon",
  article: "Article",
};

export function BlogPostCard({ post }: { post: BlogPostSummary }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group flex flex-col overflow-hidden rounded-2xl border border-ink/10 bg-ink/[0.02] transition-shadow hover:shadow-lg">
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-ink/5">
        {post.coverImageUrl ? (
          <Image
            src={post.coverImageUrl}
            alt={post.title}
            fill
            sizes="(min-width: 1024px) 420px, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : null}
        <span className="absolute left-3 top-3 rounded-full bg-brand-900/90 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-accent-400">
          {TYPE_LABEL[post.postType] ?? post.postType}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-display text-lg font-bold leading-snug text-ink group-hover:text-link">
          {post.title}
        </h3>
        {post.excerpt && <p className="line-clamp-2 text-sm leading-relaxed text-ink/60">{post.excerpt}</p>}
        <div className="mt-auto flex items-center gap-2 pt-2 text-xs text-ink/45">
          {post.authorName && <span>{post.authorName}</span>}
          {post.authorName && post.publishedAt && <span>·</span>}
          {post.publishedAt && (
            <span>
              {new Date(post.publishedAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
