// Records the first seconds of page loads in Playwright WebKit (cold, warm, reduced motion) for the load
// flash check. Usage: node scripts/qa/load-flash.mjs [url] [outDir]
import { mkdir, readdir, rename, rm } from "node:fs/promises";
import { webkit } from "playwright";
import { noCounter } from "./no-counter.mjs";

const url = process.argv[2] ?? "http://localhost:8787/";
const outDir = process.argv[3] ?? "docs/qa/phase-3a/load";
await mkdir(outDir, { recursive: true });
const browser = await webkit.launch();
noCounter(browser);

async function record(name, { reducedMotion = "no-preference", warm = false } = {}) {
  const dir = `${outDir}/_rec-${name}`;
  await rm(dir, { recursive: true, force: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion,
    recordVideo: { dir, size: { width: 1440, height: 900 } },
  });
  const page = await context.newPage();
  if (warm) {
    await page.goto(url, { waitUntil: "load" }); // fills the cache; this part of the video is cut later
    await page.waitForTimeout(1500);
    await page.evaluate(() => document.body.setAttribute("data-mark", "reload"));
  }
  const t = Date.now();
  if (warm) await page.reload({ waitUntil: "load" });
  else await page.goto(url, { waitUntil: "load" });
  await page.waitForTimeout(4000);
  await context.close();
  const files = await readdir(dir);
  await rename(`${dir}/${files[0]}`, `${outDir}/webkit-${name}.webm`);
  await rm(dir, { recursive: true, force: true });
  return { name, loadStartedAfterMs: warm ? "after warm-up" : 0, recordedMs: Date.now() - t };
}

const out = [];
out.push(await record("cold"));
out.push(await record("warm", { warm: true }));
out.push(await record("reduced-motion", { reducedMotion: "reduce" }));
await browser.close();
console.log(JSON.stringify(out, null, 2));
