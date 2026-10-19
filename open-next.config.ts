import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Default config. Add an incremental cache override (for example R2) when ISR is needed.
// See https://opennext.js.org/cloudflare/caching
export default defineCloudflareConfig();
