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
  // The old site's URLs (Phase 7a fixes; the table in docs/LAUNCH.md), permanent (308). Sections land through
  // the home page's anchors, which the scroll restore lands on exactly.
  async redirects() {
    const oldProjects = [
      "budget-tracker",
      "harvest-for-all",
      "aws-receipt-processing",
      "grab-buddy",
      "smart-vehicle-performance-system",
      "recipe-roots",
      "asia-arts-festival",
      "eventsphere",
      "pokemon-ascii",
      "pengyou",
      "english-portfolio",
    ];
    return [
      { source: "/index.html", destination: "/", permanent: true },
      { source: "/about", destination: "/#journey", permanent: true },
      { source: "/work", destination: "/#work", permanent: true },
      { source: "/contact", destination: "/#contact", permanent: true },
      { source: "/thank-you", destination: "/#contact", permanent: true },
      // The old site's project pages were numbered 1 to 11 (legacy/src/models/data.js).
      ...oldProjects.map((slug, i) => ({ source: `/work/${i + 1}`, destination: `/work/${slug}`, permanent: true })),
      { source: "/assets/resume/:file*", destination: "/resume/joshua-bonham-resume.pdf", permanent: true },
      { source: "/site.webmanifest", destination: "/manifest.webmanifest", permanent: true },
    ];
  },
};

export default nextConfig;

// Makes Cloudflare bindings available to `next dev` via getCloudflareContext().
// Dev only: on Next 15.5 the local proxy it starts keeps `next typegen` from exiting.
if (dev) {
  initOpenNextCloudflareForDev();
}
