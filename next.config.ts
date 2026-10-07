import type { NextConfig } from "next";

// Derived from NEXT_PUBLIC_SUPABASE_URL (set at build time, see
// .github/workflows/deploy.yml) rather than hardcoded, so switching
// Supabase projects or self-hosting never requires touching this file.
const supabaseUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "https://example.supabase.co");

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Product media uploads allow up to 25MB per file (admin-products.ts)
      // and expense receipts 10MB; Next's default 1MB body limit silently
      // rejected anything bigger. Headroom covers multipart overhead.
      bodySizeLimit: "26mb",
    },
  },
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
        protocol: supabaseUrl.protocol.replace(":", "") as "http" | "https",
        // Supabase Storage — where product_images.url always points (see
        // migration comments: never a raw Instagram CDN link, which expires).
        hostname: supabaseUrl.hostname,
        port: supabaseUrl.port || undefined,
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
