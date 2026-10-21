// Phase 4a performance, in the installed Chrome (CDP): LCP and CLS on project pages (Slow 4G, 4x CPU, as
// in Phase 2b), and the frame rate and long tasks while the gallery's strips expand (1440x900, and 390x844
// with 4x CPU throttling).
// Usage: node scripts/qa/work-perf.mjs [url] [outDir]
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const url = (process.argv[2] ?? "http://localhost:8787/").replace(/\/?$/, "/");
const outDir = process.argv[3] ?? "docs/qa/phase-4a";
await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
const report = {};

// Lighthouse-style Slow 4G: 150 ms RTT, 1.6 Mbps down, 750 Kbps up.
const SLOW_4G = { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 };

async function vitals(slug, mobile) {
  const context = await browser.newContext(
    mobile
      ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }
      : { viewport: { width: 1440, height: 900 } },
  );
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  if (mobile) {
    await cdp.send("Network.emulateNetworkConditions", SLOW_4G);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  }
  await page.addInitScript(() => {
    window.__lcp = null;
    window.__lcpEl = null;
    window.__cls = 0;
    new PerformanceObserver((l) => {
      const e = l.getEntries().at(-1);
      window.__lcp = e.startTime;
      window.__lcpEl = e.element ? `${e.element.tagName.toLowerCase()}${e.element.className ? "." + String(e.element.className).split(" ")[0] : ""}` : null;
    }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
    }).observe({ type: "layout-shift", buffered: true });
  });
  await page.goto(`${url}work/${slug}`, { waitUntil: "load", timeout: 120000 });
  await page.waitForTimeout(3000);
  const r = await page.evaluate(() => ({ lcp: Math.round(window.__lcp), lcpElement: window.__lcpEl, cls: +window.__cls.toFixed(4) }));
  await context.close();
  return r;
}

report.vitals = {};
for (const slug of ["fraud-detection", "plandora-llm-judge", "mapetite"]) {
  report.vitals[slug] = { desktop: await vitals(slug, false), mobileSlow4g4xCpu: await vitals(slug, true) };
}

/** Frame times while sweeping through the strips (hover on desktop, taps on the phone). */
async function sweep(mobile) {
  const context = await browser.newContext(
    mobile
      ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }
      : { viewport: { width: 1440, height: 900 } },
  );
  const page = await context.newPage();
  await page.goto(url + "#work", { waitUntil: "load" });
  await page.waitForFunction(() => !document.documentElement.hasAttribute("data-restore") && document.querySelector("section[data-phase]")?.dataset.boardCovered === "true", null, { timeout: 20000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const y = document.getElementById("work").getBoundingClientRect().top + scrollY + 60;
    if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true, force: true });
    else scrollTo(0, y);
  });
  await page.waitForTimeout(800);
  const cdp = await context.newCDPSession(page);
  if (mobile) await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.evaluate(() => {
    window.__frames = [];
    window.__long = [];
    let last = performance.now();
    const tick = (t) => {
      window.__frames.push(t - last);
      last = t;
      if (window.__frames.length < 100000) window.__raf = requestAnimationFrame(tick);
    };
    window.__raf = requestAnimationFrame(tick);
    new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push(Math.round(e.duration)))).observe({ type: "longtask" });
  });
  const slugs = ["fraud-detection", "inklusif", "touch-n-go-reporting", "pengyou", "mapetite", "coral-coders-website"];
  const order = mobile ? slugs.slice(1).concat(slugs.slice(0, 1)) : slugs.concat([...slugs].reverse());
  for (const s of order) {
    if (mobile) await page.locator(`#flight-${s} a`).tap();
    else await page.locator(`#flight-${s} a`).hover();
    await page.waitForTimeout(700);
  }
  const r = await page.evaluate(() => {
    cancelAnimationFrame(window.__raf);
    const f = window.__frames.slice(5).sort((a, b) => a - b);
    const total = f.reduce((a, b) => a + b, 0);
    return {
      frames: f.length,
      fps: +((f.length / total) * 1000).toFixed(1),
      p95FrameMs: +f[Math.floor(f.length * 0.95)].toFixed(1),
      over33ms: f.filter((x) => x > 33.4).length,
      longTasks: window.__long,
    };
  });
  await context.close();
  return r;
}

report.expand = { "1440x900": await sweep(false), "390x844 (4x CPU)": await sweep(true) };
console.log(JSON.stringify(report, null, 2));
await writeFile(`${outDir}/chrome-perf.json`, JSON.stringify(report, null, 2));
await browser.close();
