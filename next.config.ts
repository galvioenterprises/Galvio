import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Phase 1: fully static site. No server runtime in production.
  output: "export",

  // Emit /product/foo/index.html so Cloudflare serves clean URLs
  // without a trailing-slash redirect hop.
  trailingSlash: true,

  // next/image optimisation needs a server; the build pipeline
  // pre-generates AVIF/WebP variants instead.
  images: {
    unoptimized: true,
  },

  // Fail the production build on type errors rather than shipping a
  // broken static bundle. Linting runs as its own CI step; Next 16
  // no longer accepts an `eslint` key here.
  typescript: { ignoreBuildErrors: false },
};

export default nextConfig;
