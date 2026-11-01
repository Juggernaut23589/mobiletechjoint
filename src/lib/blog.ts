import { createPublicClient } from "@/lib/supabase/server";
import type { BlogPost, BlogPostType } from "@/types/database";

export interface BlogPostSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImageUrl: string | null;
  postType: BlogPostType;
  authorName: string;
  publishedAt: string | null;
}

function toSummary(row: BlogPost): BlogPostSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    coverImageUrl: row.cover_image_url,
    postType: row.post_type,
    authorName: row.author_name,
    publishedAt: row.published_at,
  };
}

export async function getPublishedBlogPosts(options: { postType?: BlogPostType; limit?: number } = {}): Promise<BlogPostSummary[]> {
  const supabase = createPublicClient();
  let query = supabase
    .from("blog_posts")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false });
  if (options.postType) query = query.eq("post_type", options.postType);
  if (options.limit) query = query.limit(options.limit);

  const { data, error } = await query;
  if (error) {
    console.error("getPublishedBlogPosts failed:", error.message);
    return [];
  }
  return (data as BlogPost[]).map(toSummary);
}

export async function getPublishedBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    console.error("getPublishedBlogPostBySlug failed:", error.message);
    return null;
  }
  return data as BlogPost | null;
}
