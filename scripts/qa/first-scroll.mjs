// First-scroll flash check (Phase 7b follow-up): on a cold load, every frame Chrome's compositor produces while
// the visitor starts scrolling at the landing, with the brightness of the frame plate (its bezel, just outside
// the glass) and of the open shade measured on each. A frame where either drops to near black is a flash.
// Usage: node scripts/qa/first-scroll.mjs [url] [outDir] [--dpr=1|2] [--runs=5] [--save]
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { noCounter } from "./no-counter.mjs";

const url = (process.argv[2] ?? "http://localhost:8787/").replace(/\/?$/, "/");
const outDir = process.argv[3] ?? "docs/qa/first-scroll";
const dpr = Number(process.argv.find((a) => a.startsWith("--dpr="))?.slice(6) ?? 2);
const runs = Number(process.argv.find((a) => a.startsWith("--runs="))?.slice(7) ?? 5);
const save = process.argv.includes("--save");
// Control: block the largest plate files, so the sharper-plate swap at the start of the push cannot happen.
const blockSharp = process.argv.includes("--block-sharp");
await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
noCounter(browser);
const results = [];

for (let run = 1; run <= runs; run++) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: dpr });
  const page = await context.newPage();
  if (blockSharp) await context.route(/frame-(landscape-3840|portrait-1620)\.(avif|webp)$/, (r) => r.abort());
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  await page.goto(url, { waitUntil: "load" });
  await page.waitForFunction(() => document.querySelector("section[data-phase]")?.dataset.phase === "open", null, { timeout: 30000 });
  await page.waitForTimeout(3500); // the intro has settled; idle-time loads (the sharp plate, frames) have run
  // Sample boxes in CSS pixels: the bezel just left of the glass, and the open shade inside the window's top.
  const boxes = await page.evaluate(() => {
    // Measured from the view (the video inside the glass): the frame plate's silver bezel just outside it on
    // each side, and the open shade's lip just above it (calibrated on a 1440x900 frame: bezel 126 to 131,
    // shade lip 24, black about 10).
    const v = document.querySelector("section[data-phase] video").getBoundingClientRect();
    return {
      bezelL: { x: v.left - 25, y: v.top + v.height / 2 - 30, w: 10, h: 60 },
      bezelR: { x: v.right + 12, y: v.top + v.height / 2 - 30, w: 10, h: 60 },
      shade: { x: v.left + 80, y: v.top - 8, w: 170, h: 6 },
    };
  });
  const frames = [];
  cdp.on("Page.screencastFrame", async (f) => {
    frames.push({ t: f.metadata.timestamp, data: f.data });
    await cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => undefined);
  });
  await cdp.send("Page.startScreencast", { format: "png", maxWidth: 1440, maxHeight: 900, everyNthFrame: 1 });
  await page.waitForTimeout(400);
  const scrollAt = Date.now() / 1000;
  await page.mouse.move(720, 450);
  for (let i = 0; i < 10; i++) {
    await page.mouse.wheel(0, 60);
    await page.waitForTimeout(40);
  }
  await page.waitForTimeout(900);
  await cdp.send("Page.stopScreencast");
  // Brightness of each box on each frame, measured by the browser (it decodes the PNGs).
  const measure = await page.evaluate(
    async ({ frames, boxes }) => {
      const out = [];
      const c = document.createElement("canvas");
      const g = c.getContext("2d", { willReadFrequently: true });
      for (const f of frames) {
        const img = new Image();
        img.src = "data:image/png;base64," + f.data;
        await img.decode();
        c.width = img.width;
        c.height = img.height;
        g.drawImage(img, 0, 0);
        const k = img.width / 1440;
        const lum = (b) => {
          const d = g.getImageData(Math.round(b.x * k), Math.round(b.y * k), Math.max(1, Math.round(b.w * k)), Math.max(1, Math.round(b.h * k))).data;
          let s = 0;
          for (let i = 0; i < d.length; i += 4) s += (d[i] + d[i + 1] + d[i + 2]) / 3;
          return Math.round(s / (d.length / 4));
        };
        out.push({ t: f.t, bezel: Math.min(lum(boxes.bezelL), lum(boxes.bezelR)), shade: lum(boxes.shade) });
      }
      return out;
    },
    { frames, boxes },
  );
  const before = measure.filter((m) => m.t < scrollAt);
  const base = { bezel: Math.max(...before.map((m) => m.bezel), 1), shade: Math.max(...before.map((m) => m.shade), 1) };
  const after = measure.filter((m) => m.t >= scrollAt);
  // A flash: the bezel or the shade falls below a quarter of its brightness before the scroll, while the
  // camera has not yet pushed far (the first 0.5 s of scrolling).
  const flashes = after.filter((m) => m.t - scrollAt < 0.5 && (m.bezel < base.bezel * 0.4 || m.shade < Math.max(14, base.shade * 0.6)));
  results.push({ run, frames: measure.length, framesAfterScroll: after.length, base, minBezel: Math.min(...after.slice(0, 20).map((m) => m.bezel)), minShade: Math.min(...after.slice(0, 20).map((m) => m.shade)), flashFrames: flashes.length });
  if (save && flashes.length) {
    for (const [i, f] of frames.entries()) if (f.t >= scrollAt && f.t - scrollAt < 0.5) await writeFile(`${outDir}/dpr${dpr}-run${run}-${String(i).padStart(3, "0")}.png`, Buffer.from(f.data, "base64"));
  }
  await context.close();
}
console.log(JSON.stringify({ url, dpr, results }, null, 1));
await browser.close();
