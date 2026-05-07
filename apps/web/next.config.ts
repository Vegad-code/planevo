import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /* config options here */
  // @ts-expect-error - Turbopack root config for monorepo/root-inference issues
  turbopack: {
    root: path.resolve(__dirname, "../../"),
  },
};

export default nextConfig;
