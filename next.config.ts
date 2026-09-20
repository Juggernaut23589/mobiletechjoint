import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Self-hosted, so every optimized variant is produced by this one server
    // and expiring it means a Supabase re-fetch plus a sharp re-encode. Next
    // 16's default is 4h, which caused a re-optimization storm several times
    // a day. Product media is uploaded to unique storage paths and never
    // edited in place, so a long TTL is safe (the docs recommend exactly this
    // when sources don't change).
    minimumCacheTTL: 60 * 60 * 24 * 31,
    remotePatterns: [
      {
        protocol: "https",
        // Supabase Storage — where product_images.url always points (see
        // migration comments: never a raw Instagram CDN link, which expires).
        hostname: "gdtehrviejxxypasywtu.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
