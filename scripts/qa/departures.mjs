// Departures board and curtain-rise checks (Phase 3a), in Playwright WebKit.
// Usage: node scripts/qa/departures.mjs [url] [outDir] [--only=transition,record,board,sound,reduced]
import { mkdir, readdir, rename, rm } from "node:fs/promises";
import { webkit } from "playwright";

const url = process.argv[2] ?? "http://localhost:8787/";
const outDir = process.argv[3] ?? "docs/qa/phase-3a";
const only = (process.argv.find((a) => a.startsWith("--only=")) ?? "--only=transition,record,board,sound,reduced")
  .slice(7)
  .split(",");
const SIZES = {
  "360x800": { width: 360, height: 800, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  "390x844": { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  "768x1024": { width: 768, height: 1024, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  "1440x900": { width: 1440, height: 900, deviceScaleFactor: 2 },
  "2560x1440": { width: 2560, height: 1440, deviceScaleFactor: 1 },
};
await mkdir(outDir, { recursive: true });
const browser = await webkit.launch();
const report = {};

async function open(name, extra = {}) {
  const vp = SIZES[name];
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
  return { context, page };
}

const waitOpen = (page) =>
  page.waitForFunction(() => document.querySelector("section[data-phase]")?.dataset.phase === "open", null, { timeout: 20000 });

/** Geometry of the sequence: scene height, sequence distance (scroll px), and the rise distance. */
const geometry = (page) =>
  page.evaluate(() => {
    const s = document.querySelector("section[data-phase]");
    const touch = matchMedia("(hover: none) and (pointer: coarse)").matches;
    const h = s.clientHeight;
    return { h, d: (touch ? 2.0 : 2.8) * h, rise: h * 1.22, vh: innerHeight };
  });

async function scrollTo(page, y, settle = 450) {
  await page.evaluate((y) => {
    if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true, force: true });
    else window.scrollTo(0, y);
  }, Math.round(y));
  await page.waitForTimeout(settle);
}

const mean = async (page) =>
  page.evaluate(async (src) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 64;
    const g = c.getContext("2d");
    g.drawImage(img, 0, 0, 64, 64);
    const d = g.getImageData(0, 0, 64, 64).data;
    let s = 0;
    let min = 255;
    for (let i = 0; i < d.length; i += 4) {
      const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      s += l;
      min = Math.min(min, l);
    }
    return { mean: Math.round(s / (d.length / 4)), min: Math.round(min) };
  }, `data:image/png;base64,${(await page.screenshot({ clip: { x: 0, y: 0, width: 300, height: 200 } })).toString("base64")}`);

if (only.includes("transition")) {
  report.transition = {};
  for (const name of ["1440x900", "390x844"]) {
    const { context, page } = await open(name);
    await page.goto(url, { waitUntil: "load" });
    await waitOpen(page);
    await page.waitForTimeout(3500);
    const { d, rise, vh } = await geometry(page);
    // The end of the sequence: the dusk floor (top-left region, where the board has not risen yet).
    await scrollTo(page, d);
    const dusk = await mean(page);
    await page.screenshot({ path: `${outDir}/transition-${name}-1-cloud.png` });
    await scrollTo(page, d + vh * 0.55);
    await page.screenshot({ path: `${outDir}/transition-${name}-2-feather.png` });
    await scrollTo(page, d + rise + 4);
    const covered = await page.evaluate(() => ({
      covered: document.querySelector("section[data-phase]").dataset.boardCovered,
      stageDisplay: getComputedStyle(document.querySelector("section[data-phase] [class*='stage']")).display,
    }));
    await page.screenshot({ path: `${outDir}/transition-${name}-3-covered.png` });
    // Darkest the mist ever gets, sampled through the whole rise.
    let darkest = 255;
    for (let k = 0; k <= 10; k++) {
      await scrollTo(page, d - 0.16 * d + (k / 10) * 0.16 * d, 150);
      darkest = Math.min(darkest, (await mean(page)).mean);
    }
    // Reverse: back to the top, compare with a fresh landing.
    await scrollTo(page, 0, 900);
    const back = await page.evaluate(() => {
      const s = document.querySelector("section[data-phase]");
      const op = (sel) => +(+getComputedStyle(s.querySelector(sel)).opacity).toFixed(3);
      return {
        camera: getComputedStyle(s.querySelector("[class*='camera']")).transform,
        hud: op("[class*='hud']"),
        canvas: op("canvas"),
        fade: op("[class*='fade']"),
        white: op("[class*='white']"),
        visibility: getComputedStyle(s).visibility,
      };
    });
    await page.screenshot({ path: `${outDir}/transition-${name}-4-reverse-top.png` });
    report.transition[name] = { duskAtSequenceEnd: dusk, darkestDuskMean: darkest, ...covered, reverse: back, errors: page.errors };
    await context.close();
  }
}

if (only.includes("record")) {
  report.record = {};
  for (const name of ["1440x900", "390x844"]) {
    const dir = `${outDir}/_rec-${name}`;
    await rm(dir, { recursive: true, force: true });
    const vp = SIZES[name];
    const { context, page } = await open(name, { recordVideo: { dir, size: { width: vp.width, height: vp.height } } });
    await page.goto(url, { waitUntil: "load" });
    await waitOpen(page);
    await page.waitForTimeout(3000);
    const { d, rise } = await geometry(page);
    const run = (from, to, ms) =>
      page.evaluate(
        ([from, to, ms]) =>
          new Promise((done) => {
            const t0 = performance.now();
            const step = (t) => {
              const k = Math.min((t - t0) / ms, 1);
              const y = from + (to - from) * k;
              if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true, force: true });
              else window.scrollTo(0, y);
              if (k < 1) requestAnimationFrame(step);
              else done();
            };
            requestAnimationFrame(step);
          }),
        [from, to, ms],
      );
    const end = d + rise + 40;
    await run(0, end, 11000);
    await page.waitForTimeout(3200); // the board flips into place
    await run(end, 0, 9000);
    await page.waitForTimeout(800);
    await context.close();
    const files = await readdir(dir);
    await rename(`${dir}/${files[0]}`, `${outDir}/departures-${name.split("x")[0]}.webm`);
    await rm(dir, { recursive: true, force: true });
    report.record[name] = `${outDir}/departures-${name.split("x")[0]}.webm`;
  }
}

if (only.includes("board")) {
  report.board = {};
  for (const name of Object.keys(SIZES)) {
    const { context, page } = await open(name);
    await page.goto(url, { waitUntil: "load" });
    await waitOpen(page);
    await page.waitForTimeout(1500);
    const { d, rise } = await geometry(page);
    await scrollTo(page, d + rise + 40, 50);
    // Mid-flip: about 0.6 s after the board starts.
    await page.waitForFunction(() => document.querySelector("[data-running]") !== null, null, { timeout: 8000 });
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${outDir}/board-${name}-midflip.png` });
    const t0 = Date.now();
    await page.waitForFunction(() => document.querySelector("[data-settled]")?.dataset.settled === "true", null, { timeout: 8000 });
    const settleMs = await page.evaluate(() => Number(document.querySelector("[data-settle-ms]")?.dataset.settleMs));
    void t0;
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${outDir}/board-${name}-settled.png` });
    const layout = await page.evaluate(() => {
      const W = document.documentElement.clientWidth;
      const tiles = [...document.querySelectorAll("[data-flap-row]")].map((e) => e.getBoundingClientRect());
      const text = [...document.querySelectorAll("[data-target]")].every((t) => {
        const g = t.querySelector("[data-part='bottom'] span");
        return g.textContent === t.dataset.target;
      });
      return {
        viewportWidth: W,
        hScroll: document.documentElement.scrollWidth > W,
        tilesLeftMost: Math.round(Math.min(...tiles.map((r) => r.left))),
        tilesRightMost: Math.round(Math.max(...tiles.map((r) => r.right))),
        tileWidth: +document.querySelector("[data-target]").getBoundingClientRect().width.toFixed(1),
        allTilesOnTarget: text,
      };
    });
    report.board[name] = { boardSettleMs: settleMs, ...layout, errors: page.errors };
    await context.close();
  }
}

if (only.includes("sound")) {
  // Count every AudioContext created and every tick scheduled; nothing may happen until the toggle.
  const { context, page } = await open("1440x900");
  await page.addInitScript(() => {
    window.__audio = { contexts: 0, sources: 0 };
    const AC = window.AudioContext ?? window.webkitAudioContext;
    if (!AC) return;
    const Wrapped = function (...a) {
      window.__audio.contexts++;
      const ctx = new AC(...a);
      const make = ctx.createBufferSource.bind(ctx);
      ctx.createBufferSource = () => {
        window.__audio.sources++;
        return make();
      };
      return ctx;
    };
    window.AudioContext = Wrapped;
    window.webkitAudioContext = Wrapped;
  });
  await page.goto(url, { waitUntil: "load" });
  await waitOpen(page);
  const { d, rise } = await geometry(page);
  await scrollTo(page, d + rise + 40, 3500);
  const before = await page.evaluate(() => ({ ...window.__audio, pressed: document.querySelector("[aria-label='Board sound']").getAttribute("aria-pressed") }));
  await page.click("[aria-label='Board sound']");
  const afterToggle = await page.evaluate(() => ({
    ...window.__audio,
    pressed: document.querySelector("[aria-label='Board sound']").getAttribute("aria-pressed"),
    stored: localStorage.getItem("jbbru:board-sound"),
  }));
  await page.reload({ waitUntil: "load" });
  await page.waitForTimeout(1500);
  const afterReload = await page.evaluate(() => ({
    ...window.__audio,
    pressed: document.querySelector("[aria-label='Board sound']").getAttribute("aria-pressed"),
  }));
  report.sound = { beforeToggle: before, afterToggle, afterReloadNoGesture: afterReload, errors: page.errors };
  await context.close();
}

if (only.includes("reduced")) {
  const { context, page } = await open("1440x900", { reducedMotion: "reduce" });
  await page.goto(url, { waitUntil: "load" });
  await page.waitForTimeout(2500);
  const state = await page.evaluate(async () => {
    document.getElementById("departures").scrollIntoView();
    await new Promise((r) => setTimeout(r, 600));
    const tiles = [...document.querySelectorAll("[data-target]")];
    return {
      settledAttribute: document.querySelector("[class*='board']")?.getAttribute("data-settled"),
      allOnTarget: tiles.every((t) => t.querySelector("[data-part='bottom'] span").textContent === t.dataset.target),
      anyFlapMoved: tiles.some((t) => t.querySelector("[data-part='flap-top']").style.transform !== ""),
      pinned: !!document.querySelector(".pin-spacer"),
    };
  });
  await page.screenshot({ path: `${outDir}/board-reduced-motion.png` });
  report.reduced = { ...state, errors: page.errors };
  await context.close();
}

await browser.close();
console.log(JSON.stringify(report, null, 2));
