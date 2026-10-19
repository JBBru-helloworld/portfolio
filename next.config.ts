import path from "node:path";
import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  // Pin the workspace root: a stray lockfile in the home folder otherwise confuses inference.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;

// Makes Cloudflare bindings available to `next dev` via getCloudflareContext().
// Dev only: on Next 15.5 the local proxy it starts keeps `next typegen` from exiting.
if (process.env.NODE_ENV === "development") {
  initOpenNextCloudflareForDev();
}
