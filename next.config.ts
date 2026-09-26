import type { NextConfig } from "next";

const dev = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  // Fully static site in production; the only server code is the Worker
  // behind /api/*. `next dev` is not an export, so it can proxy /api to
  // the local Worker (`wrangler dev`, started by `pnpm dev`) — rewrites
  // are not supported by static exports, hence dev only.
  ...(dev
    ? {
        async rewrites() {
          return [{ source: "/api/:path*", destination: "http://127.0.0.1:8787/api/:path*" }];
        },
      }
    : { output: "export" as const }),

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
