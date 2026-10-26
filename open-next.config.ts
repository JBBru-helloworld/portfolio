import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// Every page is prerendered at build time (static, or one per project) and none revalidates, so the
// prerendered HTML is served straight from the Worker's static assets (Phase 7b). Without an incremental cache
// each request re-rendered the page (about 100 ms of CPU, over the Free plan's 10 ms), and the background
// cache write that followed hung later requests in production. Cache interception answers from the cache
// before Next.js loads. Add R2 instead if a page ever needs ISR: https://opennext.js.org/cloudflare/caching
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
  enableCacheInterception: true,
});
