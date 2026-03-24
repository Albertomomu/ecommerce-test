import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      { hostname: "picsum.photos" },
      { hostname: "*.picsum.photos" },
    ],
  },
};

export default nextConfig;
