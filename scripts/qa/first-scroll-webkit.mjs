// First-scroll flash check in Safari's engine (Phase 7b follow-up). WebKit has no frame-by-frame screencast,
// so this records a video of the first scroll on a cold load and measures the frame plate's bezel on every
// video frame (ffmpeg); a 4-frame blank (about 67 ms) spans at least one 25 fps video frame.
// Usage: node scripts/qa/first-scroll-webkit.mjs [url] [outDir] [--runs=5] [--dpr=2]
import { mkdir, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { webkit } from "playwright";
import { noCounter } from "./no-counter.mjs";

const url = (process.argv[2] ?? "http://localhost:8787/").replace(/\/?$/, "/");
const outDir = process.argv[3] ?? "docs/qa/first-scroll-webkit";
const runs = Number(process.argv.find((a) => a.startsWith("--runs="))?.slice(7) ?? 5);
const dpr = Number(process.argv.find((a) => a.startsWith("--dpr="))?.slice(6) ?? 2);
await mkdir(outDir, { recursive: true });
const browser = await webkit.launch();
noCounter(browser);
const results = [];
for (let run = 1; run <= runs; run++) {
  const dir = `${outDir}/run${run}`;
  await rm(dir, { recursive: true, force: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: dpr, recordVideo: { dir, size: { width: 1440, height: 900 } } });
  const page = await context.newPage();
  await page.goto(url + `?cold=${Date.now()}`, { waitUntil: "load" });
  await page.waitForFunction(() => document.querySelector("section[data-phase]")?.dataset.phase === "open", null, { timeout: 30000 });
  await page.waitForTimeout(3500);
  const v = await page.evaluate(() => { const r = document.querySelector("section[data-phase] video").getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, height: r.height }; });
  await page.mouse.move(720, 450);
  for (let i = 0; i < 10; i++) { await page.mouse.wheel(0, 60); await page.waitForTimeout(40); }
  await page.waitForTimeout(900);
  const swapped = await page.evaluate(() => document.querySelectorAll("section[data-phase] img[class*='plate']").length);
  const video = page.video();
  await context.close();
  const file = await video.path();
  // Every frame of the last ~2.3 s (the scroll and after), as grey 1440x900 raw: the bezel's mean on each.
  const box = { x: Math.round(v.left - 25), y: Math.round(v.top + v.height / 2 - 30), w: 10, h: 60 };
  const raw = execFileSync("ffmpeg", ["-v", "error", "-sseof", "-2.3", "-i", file, "-vf", `crop=${box.w}:${box.h}:${box.x}:${box.y},format=gray`, "-f", "rawvideo", "-"], { maxBuffer: 1 << 28 });
  const per = box.w * box.h;
  const lums = [];
  for (let i = 0; i + per <= raw.length; i += per) { let s = 0; for (let j = i; j < i + per; j++) s += raw[j]; lums.push(Math.round(s / per)); }
  const base = Math.max(...lums.slice(0, 3));
  results.push({ run, videoFrames: lums.length, base, min: Math.min(...lums), flashFrames: lums.filter((l) => l < base * 0.4).length, sharpPlateSwapped: swapped > 1 });
  await rm(dir, { recursive: true, force: true });
}
console.log(JSON.stringify({ url, engine: "webkit", dpr, results }, null, 1));
await browser.close();
