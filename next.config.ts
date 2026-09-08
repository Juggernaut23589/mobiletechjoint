import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
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
