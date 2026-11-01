"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Upload } from "lucide-react";
import { createBlogPost, updateBlogPost, uploadBlogBodyImage } from "@/app/actions/staff-blog";
import { BlogBody } from "@/components/BlogBody";
import type { BlogPost } from "@/types/database";

const input = "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900";
const label = "text-xs font-medium text-neutral-500";

export function BlogPostForm({ post }: { post?: BlogPost }) {
  const router = useRouter();
  const action = post ? updateBlogPost : createBlogPost;
  const [state, formAction, pending] = useActionState(action, {});
  const [isUploadingImage, startImageUpload] = useTransition();
  const [body, setBody] = useState(post?.body ?? "");
  const [coverPreview, setCoverPreview] = useState<string | null>(post?.cover_image_url ?? null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!post && state.id) router.push(`/staff/dashboard/blog/${state.id}`);
  }, [state.id, post, router]);

  function handleCoverPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverPreview(URL.createObjectURL(file));
  }

  function handleBodyImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);

    const formData = new FormData();
    formData.set("file", file);
    if (post) formData.set("postId", post.id);

    startImageUpload(async () => {
      const result = await uploadBlogBodyImage(formData);
      if (result.error) {
        setUploadError(result.error);
        return;
      }
      const line = `IMAGE: ${result.url}`;
      setBody((prev) => (prev.trim() ? `${prev.trim()}\n\n${line}` : line));
      if (imageInputRef.current) imageInputRef.current.value = "";
    });
  }

  return (
    <form action={formAction} className="grid gap-5 lg:grid-cols-[1fr_380px]">
      {post && <input type="hidden" name="id" value={post.id} />}

      <div className="flex flex-col gap-4">
        <label className={label}>
          Title
          <input name="title" required defaultValue={post?.title} className={input} />
        </label>

        <label className={label}>
          Excerpt (short summary shown on the blog index card)
          <textarea name="excerpt" rows={2} defaultValue={post?.excerpt} className={input} />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className={label}>
            Type
            <select name="postType" defaultValue={post?.post_type ?? "article"} className={input}>
              <option value="article">Article</option>
              <option value="review">Review</option>
              <option value="upcoming">Coming Soon</option>
            </select>
          </label>
          <label className={label}>
            Author
            <input name="authorName" defaultValue={post?.author_name} className={input} placeholder="e.g. Chidinma Eze" />
          </label>
        </div>

        <div>
          <p className={`${label} mb-1.5`}>Body</p>
          <p className="mb-2 text-xs text-neutral-500">
            Separate paragraphs with a blank line. Drop an image in with the button below, embed a video with a
            line reading <code className="text-[11px]">VIDEO: https://youtube.com/watch?v=...</code>, or add a
            link button with <code className="text-[11px]">LINK: Shop this now | /products/some-product</code>.
          </p>
          <textarea
            ref={bodyRef}
            name="body"
            rows={16}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className={`${input} font-mono text-[13px]`}
          />
          <div className="mt-2 flex items-center gap-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-neutral-300 px-3 py-2 text-xs text-neutral-500 hover:border-brand-400 hover:text-brand-600">
              <Upload className="h-3.5 w-3.5" />
              {isUploadingImage ? "Uploading…" : "Insert image into body"}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                disabled={isUploadingImage}
                onChange={handleBodyImagePick}
                className="hidden"
              />
            </label>
            {uploadError && <span className="text-xs text-red-600">{uploadError}</span>}
          </div>
        </div>

        {body.trim() && (
          <div>
            <p className={`${label} mb-2`}>Preview</p>
            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              <BlogBody body={body} />
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className={`${label} mb-2`}>Cover image</p>
          {coverPreview && (
            <div className="relative mb-3 aspect-[16/10] w-full overflow-hidden rounded-md bg-neutral-100">
              <Image src={coverPreview} alt="" fill sizes="340px" className="object-cover" />
            </div>
          )}
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-neutral-300 px-4 py-3 text-sm text-neutral-500 hover:border-brand-400 hover:text-brand-600">
            <Upload className="h-4 w-4" />
            {coverPreview ? "Change cover image" : "Choose cover image"}
            <input type="file" name="coverImage" accept="image/*" onChange={handleCoverPick} className="hidden" />
          </label>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input
              type="radio"
              name="status"
              value="draft"
              defaultChecked={!post || post.status === "draft"}
              className="h-4 w-4"
            />
            Draft — not visible on the site
          </label>
          <label className="mt-2 flex items-center gap-2 text-sm text-neutral-700">
            <input
              type="radio"
              name="status"
              value="published"
              defaultChecked={post?.status === "published"}
              className="h-4 w-4"
            />
            Published — live on /blog
          </label>
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-brand-gradient px-4 py-2.5 text-sm font-semibold text-white shadow-glow disabled:opacity-50"
          >
            {pending ? "Saving…" : post ? "Save changes" : "Create post"}
          </button>
          {state.error && <span className="text-sm text-red-600">{state.error}</span>}
          {state.notice && <span className="text-sm text-green-700">{state.notice}</span>}
        </div>
      </div>
    </form>
  );
}
