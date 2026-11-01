/** Pure, client-safe blog body parsing — split out from blog.ts so the
 *  admin editor's live preview (a Client Component) can import this
 *  without pulling in next/headers via blog.ts's Supabase server client. */

export interface BlogBlock {
  type: "paragraph" | "image" | "video" | "link";
  text?: string;
  url?: string;
  caption?: string;
  label?: string;
  href?: string;
}

/** Parses a blog post body into renderable blocks. Blocks are separated
 *  by a blank line, same convention as team_members.bio. A block whose
 *  first line starts with one of these prefixes becomes that block type;
 *  anything else is a paragraph (with inline [text](url) link support).
 *  Plain-text-with-a-documented-convention, not markdown or a rich-text
 *  editor — keeps the admin editor a plain textarea and avoids a new
 *  dependency, same reasoning as curates' "Label | href" lines. */
export function parseBlogBody(body: string): BlogBlock[] {
  return body
    .split(/\n\s*\n/)
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((block): BlogBlock => {
      const imageMatch = block.match(/^IMAGE:\s*(\S+)(?:\s*\|\s*(.+))?$/i);
      if (imageMatch) return { type: "image", url: imageMatch[1], caption: imageMatch[2]?.trim() };

      const videoMatch = block.match(/^VIDEO:\s*(\S+)$/i);
      if (videoMatch) return { type: "video", url: videoMatch[1] };

      const linkMatch = block.match(/^LINK:\s*(.+?)\s*\|\s*(\S+)$/i);
      if (linkMatch) return { type: "link", label: linkMatch[1].trim(), href: linkMatch[2].trim() };

      return { type: "paragraph", text: block };
    });
}

/** youtube.com/watch?v=, youtu.be/, or vimeo.com/ links → an embeddable
 *  iframe src. Returns null for anything else (shown as a plain link
 *  instead, rather than silently dropping it). */
export function videoEmbedSrc(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]{6,})/i);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/i);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}
