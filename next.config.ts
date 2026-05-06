import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // @ts-expect-error - Turbopack root config for monorepo/root-inference issues
  turbopack: {
    root: '.',
  },
};

export default nextConfig;
