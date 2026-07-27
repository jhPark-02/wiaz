import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/wiaz",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
