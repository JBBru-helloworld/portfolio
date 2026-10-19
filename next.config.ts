import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  /* config options here */
  // Off until Cache Components work on workerd: with them on, every request hangs the Worker.
  // https://github.com/opennextjs/opennextjs-cloudflare/issues/1450 (fix: PR #1318)
  cacheComponents: false,
  partialPrefetching: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

// Makes Cloudflare bindings available to `next dev` via getCloudflareContext().
initOpenNextCloudflareForDev();
