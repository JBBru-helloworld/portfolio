import path from "node:path";
import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const dev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  // Dev-only pages (`page.dev.tsx`, such as /dev/sound) exist only under `next dev`: production builds
  // never see them.
  pageExtensions: dev ? ["dev.tsx", "tsx", "ts", "jsx", "js"] : ["tsx", "ts", "jsx", "js"],
  // Pin the workspace root: a stray lockfile in the home folder otherwise confuses inference.
  outputFileTracingRoot: path.join(__dirname),
  // No "X-Powered-By: Next.js" header (Phase 7a): it tells nobody anything useful.
  poweredByHeader: false,
};

export default nextConfig;

// Makes Cloudflare bindings available to `next dev` via getCloudflareContext().
// Dev only: on Next 15.5 the local proxy it starts keeps `next typegen` from exiting.
if (dev) {
  initOpenNextCloudflareForDev();
}
