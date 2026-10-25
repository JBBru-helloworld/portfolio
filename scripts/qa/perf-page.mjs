// Phase 6 numbers: LCP, CLS and an INP estimate for the home page and a project page; long tasks and bytes
// transferred over a full scroll from the landing to the footer. Desktop (1440x900) and a phone (390x844 on
// Slow 4G with 4x CPU). Chrome only (CDP).
// Usage: node scripts/qa/perf-page.mjs [url] [outFile]
import { writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const base = (process.argv[2] ?? "http://localhost:8787").replace(/\/$/, "");
const outFile = process.argv[3];
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
const browser = await chromium.launch({ channel: "chrome" });
const PROFILES = {
  desktop: { viewport: { width: 1440, height: 900 } },
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, throttle: true },
};
const report = { base };

async function open(profile) {
  const { throttle, ...ctxOpts } = PROFILES[profile];
  const context = await browser.newContext({ ...ctxOpts, userAgent: UA });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  if (throttle) {
    // Lighthouse's Slow 4G: 150 ms RTT, 1.6 Mbps down, 750 Kbps up; and a 4x slower CPU.
    await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  }
  let bytes = 0;
  cdp.on("Network.loadingFinished", (e) => (bytes += e.encodedDataLength));
  await page.addInitScript(() => {
    window.__m = { lcp: 0, cls: 0, longTasks: [], events: [] };
    new PerformanceObserver((l) => l.getEntries().forEach((e) => (window.__m.lcp = e.startTime))).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((l) => l.getEntries().forEach((e) => !e.hadRecentInput && (window.__m.cls += e.value))).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__m.longTasks.push(Math.round(e.duration)))).observe({ type: "longtask", buffered: true });
    new PerformanceObserver((l) => l.getEntries().forEach((e) => e.interactionId && window.__m.events.push({ name: e.name, d: Math.round(e.duration) }))).observe({ type: "event", durationThreshold: 16, buffered: true });
  });
  return { context, page, bytes: () => bytes };
}

const metrics = (page) => page.evaluate(() => ({ ...window.__m }));

for (const profile of Object.keys(PROFILES)) {
  // ---- The home page: load, then a full scroll to the footer ----
  {
    const { context, page, bytes } = await open(profile);
    await page.goto(base + "/", { waitUntil: "load", timeout: 120000 });
    await page.waitForTimeout(profile === "phone" ? 8000 : 4000);
    const load = await metrics(page);
    const loadBytes = bytes();
    await page.evaluate(() => (window.__m.longTasks = []));
    // A full scroll: wheel steps on desktop, touch-like programmatic steps on the phone (Lenis is wheel-only).
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    const step = profile === "phone" ? 420 : 300;
    for (let y = 0; y < height; y += step) {
      if (profile === "phone") await page.evaluate((s) => window.scrollBy(0, s), step);
      else await page.mouse.wheel(0, step);
      await page.waitForTimeout(profile === "phone" ? 160 : 90);
    }
    await page.waitForTimeout(2500);
    const scrolled = await metrics(page);
    // INP estimate: a few real interactions (a board row is a glide, so use in-place ones).
    await page.evaluate(() => (window.__m.events = []));
    for (const sel of ["#stack button", "#security-check [aria-label^='Passenger:']", "#contact button"]) {
      const el = page.locator(sel).first();
      if (await el.count()) {
        await el.scrollIntoViewIfNeeded().catch(() => undefined);
        await (profile === "phone" ? el.tap() : el.click()).catch(() => undefined);
        await page.waitForTimeout(700);
      }
    }
    const inter = await metrics(page);
    report[`home ${profile}`] = {
      lcpMs: Math.round(load.lcp),
      cls: +load.cls.toFixed(4),
      clsAfterScroll: +scrolled.cls.toFixed(4),
      loadKB: Math.round(loadBytes / 1024),
      fullScrollKB: Math.round(bytes() / 1024),
      longTasksDuringScroll: scrolled.longTasks.sort((a, b) => b - a).slice(0, 12),
      over50: scrolled.longTasks.filter((d) => d > 50).length,
      over100: scrolled.longTasks.filter((d) => d > 100).length,
      inpEstimateMs: Math.max(0, ...inter.events.map((e) => e.d)),
    };
    await context.close();
  }
  // ---- A project page ----
  {
    const { context, page, bytes } = await open(profile);
    await page.goto(base + "/work/fraud-detection", { waitUntil: "load", timeout: 120000 });
    await page.waitForTimeout(profile === "phone" ? 6000 : 3000);
    const m = await metrics(page);
    report[`project ${profile}`] = { lcpMs: Math.round(m.lcp), cls: +m.cls.toFixed(4), loadKB: Math.round(bytes() / 1024), longTasks: m.longTasks.sort((a, b) => b - a).slice(0, 8) };
    await context.close();
  }
}

console.log(JSON.stringify(report, null, 2));
if (outFile) await writeFile(outFile, JSON.stringify(report, null, 2));
await browser.close();
