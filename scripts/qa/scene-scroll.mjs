// Scroll-sequence checks for the landing (Phase 2c), in Playwright WebKit.
// Usage: node scripts/qa/scene-scroll.mjs [url] [outDir] [--only=captures,exact,record,network,fallbacks]
import { mkdir, rename, readdir, rm } from "node:fs/promises";
import { webkit } from "playwright";

const url = process.argv[2] ?? "http://localhost:8787/";
const outDir = process.argv[3] ?? "docs/qa/scene-2c";
const only = (process.argv.find((a) => a.startsWith("--only=")) ?? "--only=captures,exact,record,network,fallbacks")
  .slice(7)
  .split(",");
const DESKTOP = { width: 1440, height: 900, deviceScaleFactor: 2 };
const PHONE = { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true };
const SIZES = [
  { name: "390x844", ...PHONE },
  { name: "768x1024", width: 768, height: 1024, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  { name: "1440x900", ...DESKTOP },
  { name: "1920x1080", width: 1920, height: 1080, deviceScaleFactor: 1 },
  { name: "2560x1440", width: 2560, height: 1440, deviceScaleFactor: 1 },
  { name: "844x390", width: 844, height: 390, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
];
const PROGRESS = [0, 0.1, 0.3, 0.5, 0.6, 0.7, 0.78, 0.9, 1];

await mkdir(outDir, { recursive: true });
const browser = await webkit.launch();
const report = {};

async function open(size, extra = {}) {
  const { name, ...vp } = size;
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.deviceScaleFactor,
    isMobile: vp.isMobile ?? false,
    hasTouch: vp.hasTouch ?? false,
    ...extra,
  });
  const page = await context.newPage();
  page.errors = [];
  page.on("pageerror", (e) => page.errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && page.errors.push(m.text()));
  return { context, page, name };
}

async function waitOpen(page) {
  await page.waitForFunction(() => document.querySelector("section[data-phase]")?.dataset.phase === "open", null, {
    timeout: 20000,
  });
}

/** Scrolls to a progress of the pinned sequence and waits for it to settle. */
async function seek(page, p) {
  await page.evaluate((p) => {
    const s = document.querySelector("section[data-phase]");
    const touch = matchMedia("(hover: none) and (pointer: coarse)").matches;
    const y = Math.round(p * (touch ? 2.0 : 2.8) * s.clientHeight);
    if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true, force: true });
    else window.scrollTo(0, y);
  }, p);
  await page.waitForTimeout(450);
}

async function waitFrames(page) {
  // Frames load after the intro when the browser is idle; give them time on a local server.
  await page.waitForTimeout(3500);
}

if (only.includes("captures")) {
  report.captures = {};
  for (const size of [SIZES[2], SIZES[0]]) {
    const { context, page, name } = await open(size);
    await page.goto(url, { waitUntil: "load" });
    await waitOpen(page);
    await waitFrames(page);
    for (const p of PROGRESS) {
      await seek(page, p);
      await page.screenshot({ path: `${outDir}/${name}-${String(Math.round(p * 100)).padStart(3, "0")}.png` });
    }
    report.captures[name] = { errors: page.errors };
    await context.close();
  }
}

if (only.includes("exact")) {
  // At the end of the push (55%) the view must cover the viewport. Paint the view magenta, hide every
  // layer above it that is meant to be transparent there, and count pixels that are not magenta.
  report.exact = {};
  for (const size of SIZES) {
    const { context, page, name } = await open(size);
    await page.goto(url, { waitUntil: "load" });
    await waitOpen(page);
    await seek(page, 0.55);
    await page.addStyleTag({
      // (At 55% the canvas has taken over and the window is hidden beneath it; show it again for the test.)
      content: `video{visibility:hidden!important} [class*="view"]{background:#ff00ff!important}
        [class*="stage"]{visibility:visible!important}
        canvas,[class*="sheen"],[class*="white"],[class*="fade"],[class*="grain"],[class*="vignette"],[class*="hud"]{display:none!important}`,
    });
    await page.waitForTimeout(300);
    const shot = `${outDir}/exact-55-${name}.png`;
    await page.screenshot({ path: shot });
    const stats = await page.evaluate(async (src) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      const g = c.getContext("2d");
      g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data;
      let bad = 0;
      for (let i = 0; i < d.length; i += 4) {
        const [r, gg, b] = [d[i], d[i + 1], d[i + 2]];
        if (!(r - gg > 60 && b - gg > 60)) bad++;
      }
      return { pixels: d.length / 4, notView: bad };
    }, `data:image/png;base64,${(await page.screenshot()).toString("base64")}`);
    report.exact[name] = stats;
    await context.close();
  }
}

if (only.includes("record")) {
  report.record = {};
  for (const size of [SIZES[2], SIZES[0]]) {
    const dir = `${outDir}/_video-${size.name}`;
    await rm(dir, { recursive: true, force: true });
    const { context, page, name } = await open(size, {
      recordVideo: { dir, size: { width: size.width, height: size.height } },
    });
    await page.goto(url, { waitUntil: "load" });
    await waitOpen(page);
    await waitFrames(page);
    // Scroll down through the whole sequence and back up, at a steady reading pace.
    const run = (from, to, ms) =>
      page.evaluate(
        ([from, to, ms]) =>
          new Promise((done) => {
            const s = document.querySelector("section[data-phase]");
            const touch = matchMedia("(hover: none) and (pointer: coarse)").matches;
            const d = (touch ? 2.0 : 2.8) * s.clientHeight;
            const t0 = performance.now();
            const step = (t) => {
              const k = Math.min((t - t0) / ms, 1);
              const y = (from + (to - from) * k) * d;
              if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true, force: true });
              else window.scrollTo(0, y);
              if (k < 1) requestAnimationFrame(step);
              else done();
            };
            requestAnimationFrame(step);
          }),
        [from, to, ms],
      );
    await page.waitForTimeout(800);
    await run(0, 1.15, 9000);
    await page.waitForTimeout(800);
    await run(1.15, 0, 9000);
    await page.waitForTimeout(800);
    await context.close();
    const files = await readdir(dir);
    await rename(`${dir}/${files[0]}`, `${outDir}/scroll-${name.split("x")[0]}.webm`);
    await rm(dir, { recursive: true, force: true });
    report.record[name] = `${outDir}/scroll-${name.split("x")[0]}.webm`;
  }
}

if (only.includes("network")) {
  report.network = {};
  for (const size of [SIZES[2], SIZES[0]]) {
    const { context, page, name } = await open(size);
    const t0 = Date.now();
    const reqs = [];
    page.on("requestfinished", async (r) => {
      if (!r.url().includes("/scene/")) return;
      const res = await r.response();
      const body = res ? await res.body().catch(() => null) : null;
      reqs.push({ url: new URL(r.url()).pathname, t: Date.now() - t0, bytes: body ? body.length : 0 });
    });
    let openAt = null;
    await page.goto(url, { waitUntil: "load" });
    await waitOpen(page);
    openAt = Date.now() - t0;
    await page.waitForTimeout(8000);
    const fly = reqs.filter((r) => r.url.startsWith("/scene/fly/"));
    report.network[name] = {
      introOpenAtMs: openAt,
      firstFlyRequestAtMs: fly.length ? Math.min(...fly.map((r) => r.t)) : null,
      lastFlyRequestAtMs: fly.length ? Math.max(...fly.map((r) => r.t)) : null,
      flyFiles: fly.length,
      flyBytes: fly.reduce((a, r) => a + r.bytes, 0),
      landingBytes: reqs.filter((r) => !r.url.startsWith("/scene/fly/")).reduce((a, r) => a + r.bytes, 0),
      landingFiles: reqs.filter((r) => !r.url.startsWith("/scene/fly/")).map((r) => `${r.url} ${r.bytes}`),
      errors: page.errors,
    };
    await context.close();
  }
}

if (only.includes("fallbacks")) {
  report.fallbacks = {};
  // Reduced motion: no pin, no frames.
  {
    const { context, page } = await open(SIZES[2], { reducedMotion: "reduce" });
    const fly = [];
    page.on("request", (r) => r.url().includes("/scene/fly/") && fly.push(r.url()));
    await page.goto(url, { waitUntil: "load" });
    await page.waitForTimeout(6000);
    const state = await page.evaluate(async () => {
      const s = document.querySelector("section[data-phase]");
      window.scrollTo(0, s.clientHeight);
      await new Promise((r) => setTimeout(r, 500));
      return {
        phase: s.dataset.phase,
        pinned: !!document.querySelector(".pin-spacer"),
        sectionTopAfterOneScreen: Math.round(s.getBoundingClientRect().top),
      };
    });
    report.fallbacks.reducedMotion = { ...state, flyRequests: fly.length, errors: page.errors };
    await context.close();
  }
  // Save-Data: the push runs, no frames are requested.
  {
    const { context, page } = await open(SIZES[2]);
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "connection", { value: { saveData: true, effectiveType: "4g" } });
    });
    const fly = [];
    page.on("request", (r) => r.url().includes("/scene/fly/") && fly.push(r.url()));
    await page.goto(url, { waitUntil: "load" });
    await waitOpen(page);
    await page.waitForTimeout(4000);
    await seek(page, 0.75);
    const white = await page.evaluate(() => getComputedStyle(document.querySelector("[class*='white']")).opacity);
    await page.screenshot({ path: `${outDir}/savedata-075.png` });
    report.fallbacks.saveData = { flyRequests: fly.length, whiteAt75: +white, errors: page.errors };
    await context.close();
  }
  // Keyboard: Page Down all the way through the sequence and into the next section.
  {
    const { context, page } = await open(SIZES[2]);
    await page.goto(url, { waitUntil: "load" });
    await waitOpen(page);
    await page.mouse.click(700, 450);
    const ys = [];
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press("PageDown");
      await page.waitForTimeout(500);
      ys.push(await page.evaluate(() => Math.round(scrollY)));
    }
    const departuresTop = await page.evaluate(() => Math.round(document.getElementById("departures").getBoundingClientRect().top));
    report.fallbacks.keyboard = { scrollYs: ys, departuresTop, errors: page.errors };
    await context.close();
  }
  // Skip intro: the first Tab focuses it; Enter jumps to the next section and moves focus there.
  {
    const { context, page } = await open(SIZES[2]);
    await page.goto(url, { waitUntil: "load" });
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => document.activeElement?.textContent);
    await page.screenshot({ path: `${outDir}/skip-intro-focus.png` });
    await page.keyboard.press("Enter");
    await page.waitForTimeout(600);
    const after = await page.evaluate(() => ({
      active: document.activeElement?.id,
      departuresTop: Math.round(document.getElementById("departures").getBoundingClientRect().top),
    }));
    report.fallbacks.skipIntro = { firstTab: focused, ...after, errors: page.errors };
    await context.close();
  }
  // Reload mid-sequence: restore the state for that scroll position.
  {
    const { context, page } = await open(SIZES[2]);
    await page.goto(url, { waitUntil: "load" });
    await waitOpen(page);
    await waitFrames(page);
    await seek(page, 0.7);
    const before = await page.evaluate(() => Math.round(scrollY));
    await page.reload({ waitUntil: "load" });
    await page.waitForTimeout(3000);
    const after = await page.evaluate(() => ({
      scrollY: Math.round(scrollY),
      phase: document.querySelector("section[data-phase]").dataset.phase,
      canvas: +getComputedStyle(document.querySelector("canvas")).opacity,
      white: +getComputedStyle(document.querySelector("[class*='white']")).opacity,
    }));
    await page.screenshot({ path: `${outDir}/reload-070.png` });
    report.fallbacks.reload = { scrollYBefore: before, ...after, errors: page.errors };
    await context.close();
  }
}

await browser.close();
console.log(JSON.stringify(report, null, 2));
