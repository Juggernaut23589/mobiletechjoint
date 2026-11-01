import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { parseBlogBody, videoEmbedSrc, type BlogBlock } from "@/lib/blog-parser";

/** Renders [text](url) inline links and **bold** within a paragraph —
 *  the only inline formatting the body syntax supports, kept deliberately
 *  small rather than pulling in a markdown dependency. */
function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      const isExternal = /^https?:\/\//.test(link[2]);
      return isExternal ? (
        <a key={i} href={link[2]} target="_blank" rel="noopener noreferrer" className="text-link underline">
          {link[1]}
        </a>
      ) : (
        <Link key={i} href={link[2]} className="text-link underline">
          {link[1]}
        </Link>
      );
    }
    const bold = part.match(/^\*\*([^*]+)\*\*$/);
    if (bold) return <strong key={i} className="font-semibold text-ink">{bold[1]}</strong>;
    return part;
  });
}

function BlockView({ block }: { block: BlogBlock }) {
  switch (block.type) {
    case "image":
      return (
        <figure className="my-2">
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-ink/5">
            <Image src={block.url!} alt={block.caption ?? ""} fill sizes="(min-width: 768px) 700px, 100vw" className="object-cover" />
          </div>
          {block.caption && <figcaption className="mt-2 text-center text-xs text-ink/50">{block.caption}</figcaption>}
        </figure>
      );
    case "video": {
      const src = videoEmbedSrc(block.url!);
      if (!src) {
        return (
          <a href={block.url} target="_blank" rel="noopener noreferrer" className="text-link underline">
            {block.url}
          </a>
        );
      }
      return (
        <div className="relative my-2 aspect-video w-full overflow-hidden rounded-2xl bg-black">
          <iframe
            src={src}
            title="Embedded video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        </div>
      );
    }
    case "link":
      return (
        <Link
          href={block.href!}
          className="group my-2 inline-flex items-center gap-2 rounded-full bg-brand-900 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-brand-700"
        >
          {block.label}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      );
    default:
      return <p className="leading-relaxed text-ink/75">{renderInline(block.text ?? "")}</p>;
  }
}

export function BlogBody({ body }: { body: string }) {
  const blocks = parseBlogBody(body);
  return (
    <div className="flex flex-col gap-5 text-[15px]">
      {blocks.map((block, i) => (
        <BlockView key={i} block={block} />
      ))}
    </div>
  );
}
