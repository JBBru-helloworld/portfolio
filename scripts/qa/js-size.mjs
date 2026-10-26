// First-load JavaScript (gzip -9) for a page, as a modern browser downloads it: every <script src> in the
// HTML except `nomodule` (the polyfill only old browsers fetch).
// Usage: node scripts/qa/js-size.mjs [url] [path ...]
import { gzipSync } from "node:zlib";
const base = (process.argv[2] ?? "http://localhost:8787").replace(/\/$/, "");
const paths = process.argv.slice(3).length ? process.argv.slice(3) : ["/", "/work/fraud-detection"];
for (const p of paths) {
  const html = await (await fetch(base + p)).text();
  const tags = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*>/g)];
  let modern = 0, nomodule = 0;
  for (const [tag, src] of tags) {
    const gz = gzipSync(Buffer.from(await (await fetch(new URL(src, base))).arrayBuffer()), { level: 9 }).length;
    if (/\bnomodule\b/i.test(tag)) nomodule += gz;
    else modern += gz;
  }
  console.log(`${p}  first load ${(modern / 1024).toFixed(1)} KB gzip (${tags.length} scripts; nomodule polyfill ${(nomodule / 1024).toFixed(1)} KB, not fetched by modern browsers)`);
}
