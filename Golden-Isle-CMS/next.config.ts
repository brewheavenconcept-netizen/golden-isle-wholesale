import type { NextConfig } from "next";

const isStatic = process.env.IS_STATIC === 'true';

const nextConfig: NextConfig = {
  output: isStatic ? "export" : undefined,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "zmroftvziytyzjmnpuqd.supabase.co",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;

