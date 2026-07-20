import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Interface paiement servie par Traefik sous kernel-core.yowyob.com/pay.
  basePath: "/pay",
  typescript: { ignoreBuildErrors: true },
  /* config options here */
  reactCompiler: true,
};

export default nextConfig;
