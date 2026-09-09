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
        <AnimatePresence mode="wait">
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
                className="object-cover"
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
              <Image src={img.url} alt={productName} fill sizes="100px" className="object-cover" />
            </button>
          ))}
        </div>
      )}

      {videos.map((video) => (
        <video
          key={video.id}
          src={video.url}
          controls
          playsInline
          className="w-full rounded-2xl bg-black"
        />
      ))}
    </div>
  );
}
