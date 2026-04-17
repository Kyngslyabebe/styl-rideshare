import type { NextConfig } from "next";
import path from "path";

const monorepoRoot = path.join(__dirname, "../..").replace(/\\/g, "/");

const nextConfig: NextConfig = {
  transpilePackages: ["@styl/shared"],
  // Ensure workspace-hoisted deps resolve from monorepo root (for build tracing)
  outputFileTracingRoot: monorepoRoot,
  // Acknowledge Turbopack explicitly so the webpack block below doesn't trigger the "ambiguous bundler" error
  turbopack: {},
  // Webpack fallback (only used when Next is invoked with --webpack)
  webpack: (config) => {
    config.resolve.modules = [
      path.join(__dirname, "node_modules"),
      path.join(__dirname, "../../node_modules"),
      "node_modules",
    ];
    return config;
  },
};

export default nextConfig;
