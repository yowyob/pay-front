import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Interface paiement servie par Traefik sous kernel-core.yowyob.com/pay
  // (pas de StripPrefix côté Traefik → le basePath est indispensable au routage).
  basePath: "/pay",
  typescript: { ignoreBuildErrors: true },
  reactCompiler: true,
};

export default nextConfig;
