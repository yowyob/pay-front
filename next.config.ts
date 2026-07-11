import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Servi sous kernel-core.yowyob.com/pay (même domaine que le kernel).
  basePath: "/pay",
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
