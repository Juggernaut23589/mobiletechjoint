"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import type { ProductImage } from "@/types/database";

export function ProductGallery({
  images,
  videos,
  productName,
}: {
  images: ProductImage[];
  videos: ProductImage[];
  productName: string;
}) {
  const [activeId, setActiveId] = useState(images[0]?.id);
  const active = images.find((img) => img.id === activeId) ?? images[0] ?? null;

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-neutral-100">
        {/* initial={false}: only animate on thumbnail switches, not the
            first paint — the product photo must never depend on a mount
            animation completing just to be visible. */}
        <AnimatePresence mode="wait" initial={false}>
          {active ? (
            <motion.div
              key={active.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0"
            >
              <Image
                src={active.url}
                alt={productName}
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-contain p-6"
                priority
              />
            </motion.div>
          ) : (
            <div className="flex h-full items-center justify-center text-neutral-400">
              No image
            </div>
          )}
        </AnimatePresence>
      </div>

      {images.length > 1 && (
        <div className="grid grid-cols-5 gap-2">
          {images.map((img) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActiveId(img.id)}
              className={`relative aspect-square overflow-hidden rounded-lg bg-neutral-100 ring-2 transition-all ${
                img.id === active?.id ? "ring-brand-600" : "ring-transparent hover:ring-brand-200"
              }`}
            >
              <Image src={img.url} alt={productName} fill sizes="100px" className="object-contain p-1.5" />
            </button>
          ))}
        </div>
      )}

      {videos.map((video) => {
        const embedUrl = toYouTubeEmbedUrl(video.url);
        return embedUrl ? (
          <div key={video.id} className="aspect-video w-full overflow-hidden rounded-2xl bg-black">
            <iframe
              src={embedUrl}
              title={`${productName} video`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
            />
          </div>
        ) : (
          <video
            key={video.id}
            src={video.url}
            controls
            playsInline
            className="w-full rounded-2xl bg-black"
          />
        );
      })}
    </div>
  );
}

/** Convert a youtube.com/watch, youtu.be, or youtube.com/shorts URL into an
 *  embeddable player URL. Returns null for non-YouTube URLs (e.g. a direct
 *  .mp4 file), which fall back to the native <video> element above. */
function toYouTubeEmbedUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\.|^m\./, "");
  let videoId: string | null = null;

  if (host === "youtu.be") {
    videoId = parsed.pathname.slice(1);
  } else if (host === "youtube.com") {
    if (parsed.pathname === "/watch") {
      videoId = parsed.searchParams.get("v");
    } else if (parsed.pathname.startsWith("/shorts/")) {
      videoId = parsed.pathname.split("/")[2];
    } else if (parsed.pathname.startsWith("/embed/")) {
      videoId = parsed.pathname.split("/")[2];
    }
  }

  return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
}
