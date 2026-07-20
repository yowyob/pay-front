import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // L interface paiement est servie par Traefik sous kernel-core.yowyob.com/pay.
  basePath: "/pay",
  reactCompiler: true,
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
