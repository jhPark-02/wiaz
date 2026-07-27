import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/wiaz-oms",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
