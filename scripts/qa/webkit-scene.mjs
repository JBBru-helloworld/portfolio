// Safari check for the window scene, using Playwright WebKit.
// Usage: node scripts/qa/webkit-scene.mjs [url] [outDir]
import { mkdir } from "node:fs/promises";
import { webkit } from "playwright";

const url = process.argv[2] ?? "http://localhost:8787/";
const outDir = process.argv[3] ?? "docs/qa/scene-2b";
const sizes = [
  { name: "webkit-390x844", width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  { name: "webkit-1440x900", width: 1440, height: 900, deviceScaleFactor: 2 },
];

await mkdir(outDir, { recursive: true });
const browser = await webkit.launch();
const results = [];

for (const s of sizes) {
  const context = await browser.newContext({
    viewport: { width: s.width, height: s.height },
    deviceScaleFactor: s.deviceScaleFactor,
    isMobile: s.isMobile ?? false,
    hasTouch: s.hasTouch ?? false,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(url, { waitUntil: "load" });
  // Intro: up to 2.5 s wait + 0.3 s pause + 1.6 s lift.
  await page.waitForFunction(() => document.querySelector("section[data-phase]")?.dataset.phase === "open", null, {
    timeout: 15000,
  });
  await page.waitForTimeout(1200);

  const info = await page.evaluate(() => {
    const scene = document.querySelector("section[data-phase]");
    const img = scene.querySelector("picture img");
    const video = scene.querySelector("video");
    const view = video.parentElement;
    const shade = view.children[2];
    const grain = scene.querySelector("[class*='grain_']") ?? scene.querySelector("[class*='grain']");
    const vcs = getComputedStyle(view);
    return {
      phase: scene.dataset.phase,
      plate: img.currentSrc.replace(location.origin, ""),
      plateLoaded: img.complete && img.naturalWidth > 0,
      canPlayAv1: video.canPlayType('video/webm; codecs="av01.0.08M.08"'),
      canPlayH264: video.canPlayType('video/mp4; codecs="avc1.640032"'),
      videoChoice: video.dataset.source,
      videoSrc: video.currentSrc.replace(location.origin, ""),
      videoPlaying: !video.paused && video.readyState >= 3,
      videoTime: video.currentTime,
      clipPath: vcs.clipPath || vcs.webkitClipPath,
      shadeTranslate: getComputedStyle(shade).translate,
      grainAnimation: grain ? getComputedStyle(grain).animationName : "not found",
    };
  });

  // Is the video actually advancing?
  const t0 = info.videoTime;
  await page.waitForTimeout(800);
  info.videoAdvancing = (await page.evaluate(() => document.querySelector("video").currentTime)) > t0;

  await page.screenshot({ path: `${outDir}/${s.name}.png` });
  results.push({ size: s.name, ...info, consoleErrors: errors });
  await context.close();
}

await browser.close();
console.log(JSON.stringify(results, null, 2));
