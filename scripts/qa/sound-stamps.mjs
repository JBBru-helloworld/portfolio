// Sound system, sound toggles and passport stamps (Phase 3b), in Playwright WebKit.
// Usage: node scripts/qa/sound-stamps.mjs [url] [outDir] [--only=sound,toggle,stamps,record,reduced,a11y]
import { mkdir, readdir, rename, rm } from "node:fs/promises";
import { webkit } from "playwright";
import { noCounter } from "./no-counter.mjs";

const url = (process.argv[2] ?? "http://localhost:8787/").replace(/\/?$/, "/");
const outDir = process.argv[3] ?? "docs/qa/phase-3b";
const only = (process.argv.find((a) => a.startsWith("--only=")) ?? "--only=sound,toggle,stamps,record,reduced,a11y").slice(7).split(",");
const SIZES = {
  "360x800": { width: 360, height: 800, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  "390x844": { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  "768x1024": { width: 768, height: 1024, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  "1440x900": { width: 1440, height: 900, deviceScaleFactor: 2 },
  "2560x1440": { width: 2560, height: 1440, deviceScaleFactor: 1 },
};
await mkdir(outDir, { recursive: true });
const browser = await webkit.launch();
noCounter(browser);
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
  page.soundRequests = [];
  page.on("pageerror", (e) => page.errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && page.errors.push(m.text()));
  page.on("request", (r) => r.url().includes("/sound/") && page.soundRequests.push(new URL(r.url()).pathname));
  // Count every oscillator (the chime and the synth) and buffer source created.
  await page.addInitScript(() => {
    window.__audio = { contexts: 0, oscillators: 0, sources: 0 };
    const AC = window.AudioContext ?? window.webkitAudioContext;
    if (!AC) return;
    const Wrapped = function (...a) {
      window.__audio.contexts++;
      const ctx = new AC(...a);
      const osc = ctx.createOscillator.bind(ctx);
      ctx.createOscillator = () => (window.__audio.oscillators++, osc());
      const src = ctx.createBufferSource.bind(ctx);
      ctx.createBufferSource = () => (window.__audio.sources++, src());
      return ctx;
    };
    window.AudioContext = Wrapped;
    window.webkitAudioContext = Wrapped;
  });
  return { context, page };
}

const waitOpen = (page) =>
  page.waitForFunction(() => document.querySelector("section[data-phase]")?.dataset.phase === "open", null, { timeout: 20000 });

const geometry = (page) =>
  page.evaluate(() => {
    const s = document.querySelector("section[data-phase]");
    const touch = matchMedia("(hover: none) and (pointer: coarse)").matches;
    const h = s.clientHeight;
    return { d: (touch ? 2.0 : 2.8) * h, rise: h * 1.22 };
  });

async function scrollTo(page, y, settle = 450) {
  await page.evaluate((y) => {
    if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true, force: true });
    else window.scrollTo(0, y);
  }, Math.round(y));
  await page.waitForTimeout(settle);
}

const toBoard = async (page) => {
  const { d, rise } = await geometry(page);
  await scrollTo(page, d + rise + 40, 100);
};
const settled = (page) =>
  page.waitForFunction(() => document.querySelector("[data-settled]")?.dataset.settled === "true", null, { timeout: 10000 });
const stats = (page) => page.evaluate(() => ({ ...window.__audio, ...(window.__soundStats?.() ?? {}) }));
const boardToggle = "#departures button[aria-label='Sound']";

// ---------- Sound: off by default, toggle, saved preference, chime, voice cap ----------
if (only.includes("sound")) {
  const r = {};
  const { context, page } = await open("1440x900");
  await page.goto(url, { waitUntil: "load" });
  await waitOpen(page);
  await toBoard(page);
  await settled(page);
  await page.evaluate(() => document.getElementById("journey").scrollIntoView());
  await page.waitForTimeout(1500);
  r.offByDefault = { soundRequests: [...page.soundRequests], audio: await stats(page) };
  // The toggle: unlocks and plays at once.
  await page.evaluate(() => document.getElementById("departures").scrollIntoView());
  await page.waitForTimeout(400);
  await page.click(boardToggle);
  await page.waitForTimeout(900);
  r.afterToggle = {
    pressed: await page.getAttribute(boardToggle, "aria-pressed"),
    stored: await page.evaluate(() => localStorage.getItem("jbbru:board-sound")),
    soundRequests: [...page.soundRequests],
    audio: await stats(page),
  };
  // Chime: opening the corner sign only.
  await page.evaluate(() => document.getElementById("work").scrollIntoView());
  await page.waitForTimeout(700);
  const a0 = await stats(page);
  await page.click("header nav button[aria-expanded]");
  await page.waitForTimeout(900);
  const a1 = await stats(page);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(900);
  const a2 = await stats(page);
  // The recording plays as one buffer source; the synthesised fallback would show four oscillators.
  r.chime = {
    onOpen: { sources: a1.sources - a0.sources, oscillators: a1.oscillators - a0.oscillators },
    onClose: { sources: a2.sources - a1.sources, oscillators: a2.oscillators - a1.oscillators },
    chimeRequests: page.soundRequests.filter((p) => p.includes("chime")),
  };
  // Saved as on: a reload stays silent until the first key press.
  page.soundRequests.length = 0;
  await page.goto(url, { waitUntil: "load" });
  await page.waitForTimeout(2500);
  r.reloadSavedOn = { beforeGesture: { soundRequests: [...page.soundRequests], audio: await stats(page) } };
  await page.keyboard.press("Shift");
  await page.waitForTimeout(1200);
  r.reloadSavedOn.afterFirstKey = { soundRequests: [...page.soundRequests], audio: await stats(page) };
  // Voice cap through a full board flip, sound on.
  await waitOpen(page);
  await toBoard(page);
  await page.waitForFunction(() => document.querySelector("[data-running]") !== null, null, { timeout: 8000 }).catch(() => null);
  const before = await stats(page);
  let peakSeen = 0;
  const t0 = Date.now();
  while (Date.now() - t0 < 3000) {
    peakSeen = Math.max(peakSeen, (await stats(page)).voices ?? 0);
    await page.waitForTimeout(30);
  }
  const after = await stats(page);
  r.voiceCap = { maxVoices: after.maxVoices, peakEver: after.peak, peakSampled: peakSeen, played: after.played - before.played, dropped: after.dropped - before.dropped, format: after.format };
  r.errors = page.errors;
  await context.close();
  // The AAC fallback: with WebM refused, the M4A files load and decode.
  const fb = await open("1440x900");
  await fb.page.route("**/sound/**/*.webm", (route) => route.abort());
  await fb.page.route("**/sound/*.webm", (route) => route.abort());
  await fb.page.goto(url, { waitUntil: "load" });
  await waitOpen(fb.page);
  await toBoard(fb.page);
  await settled(fb.page);
  await fb.page.click(boardToggle);
  await fb.page.waitForTimeout(1500);
  r.m4aFallback = { soundRequests: [...fb.page.soundRequests], audio: await stats(fb.page) };
  await fb.context.close();
  report.sound = r;
}

// ---------- Toggle captures: board header (off, hint, on) and the corner panel ----------
if (only.includes("toggle")) {
  report.toggle = {};
  for (const name of ["360x800", "1440x900"]) {
    const { context, page } = await open(name);
    await page.goto(url, { waitUntil: "load" });
    await waitOpen(page);
    await toBoard(page);
    await settled(page);
    await page.waitForTimeout(500);
    const head = async (file) => {
      const box = await page.evaluate(() => {
        const r = document.querySelector("#departures [class*='head']").getBoundingClientRect();
        return { x: 0, y: Math.max(0, r.top - 12), width: innerWidth, height: r.height + 90 };
      });
      await page.screenshot({ path: `${outDir}/${file}`, clip: box });
    };
    const hint = await page.evaluate(() => getComputedStyle(document.querySelector("[class*='hint']")).opacity);
    await head(`toggle-${name}-hint.png`);
    await page.waitForTimeout(4600);
    const hintAfter = await page.evaluate(() => getComputedStyle(document.querySelector("[class*='hint']")).opacity);
    await head(`toggle-${name}-off.png`);
    await page.click(boardToggle);
    await page.waitForTimeout(700);
    await head(`toggle-${name}-on.png`);
    await page.evaluate(() => document.getElementById("work").scrollIntoView());
    await page.waitForTimeout(700);
    await page.click("header nav button[aria-expanded]");
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${outDir}/toggle-${name}-panel.png` });
    const panel = await page.evaluate(() => ({
      pressed: document.querySelector("header nav [aria-label='Sound']")?.getAttribute("aria-pressed"),
      hScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    }));
    report.toggle[name] = { hintOpacityAtSettle: hint, hintOpacityAfter4_6s: hintAfter, panel, errors: page.errors };
    await context.close();
  }
}

// ---------- Stamps: mid-landing and settled at five sizes, 400% ink crops ----------
if (only.includes("stamps")) {
  report.stamps = {};
  for (const name of Object.keys(SIZES)) {
    const { context, page } = await open(name);
    await page.goto(url, { waitUntil: "load" });
    await waitOpen(page);
    await toBoard(page);
    await page.waitForTimeout(300);
    // Bring the first stamp past the 60% line.
    await page.evaluate(() => {
      const e = document.querySelector("[data-entry]");
      const y = e.getBoundingClientRect().top + scrollY - innerHeight * 0.45;
      if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true, force: true });
      else window.scrollTo(0, y);
    });
    await page.waitForFunction(() => document.querySelector("[data-landing]") !== null, null, { timeout: 6000 });
    await page.waitForTimeout(110);
    await page.screenshot({ path: `${outDir}/stamps-${name}-midlanding.png` });
    // Then bring the whole page into view so every stamp lands, in order.
    await page.evaluate(() => {
      const p = document.querySelector("#journey [class*='page']");
      const r = p.getBoundingClientRect();
      const y = r.bottom + scrollY - innerHeight * 0.58;
      if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true, force: true });
      else window.scrollTo(0, y);
    });
    const order = await page.evaluate(
      () =>
        new Promise((done) => {
          const seen = [];
          const items = [...document.querySelectorAll("[data-entry]")];
          const t0 = performance.now();
          const check = () => {
            items.forEach((el, i) => {
              if (el.hasAttribute("data-landed") && !seen.find((s) => s.i === i)) seen.push({ i, ms: Math.round(performance.now() - t0) });
            });
            if (seen.length === items.length || performance.now() - t0 > 6000) done(seen);
            else requestAnimationFrame(check);
          };
          check();
        }),
    );
    await page.waitForTimeout(300);
    await page.evaluate(() => document.getElementById("journey").scrollIntoView());
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${outDir}/stamps-${name}-settled.png`, fullPage: false });
    const layout = await page.evaluate(() => {
      const W = document.documentElement.clientWidth;
      const stamps = [...document.querySelectorAll("[data-stamp]")].map((s) => s.getBoundingClientRect());
      return {
        hScroll: document.documentElement.scrollWidth > W,
        stampsInside: stamps.every((r) => r.left >= 0 && r.right <= W),
        stampWidths: stamps.map((r) => Math.round(r.width)),
      };
    });
    if (name === "1440x900") {
      const boxes = await page.evaluate(() =>
        [...document.querySelectorAll("[data-stamp]")].map((s) => {
          const r = s.getBoundingClientRect();
          return { x: r.left + r.width * 0.3, y: r.top + r.height * 0.3, width: 80, height: 60 };
        }),
      );
      for (const [i, b] of boxes.entries()) {
        await page.screenshot({ path: `${outDir}/stamp-ink-crop-${["za", "mu", "my"][i]}-raw.png`, clip: b });
      }
    }
    report.stamps[name] = { landingOrder: order, ...layout, errors: page.errors };
    await context.close();
  }
}

// ---------- A recording scrolling into the section ----------
if (only.includes("record")) {
  const dir = `${outDir}/_rec`;
  await rm(dir, { recursive: true, force: true });
  const { context, page } = await open("1440x900", { recordVideo: { dir, size: { width: 1440, height: 900 } } });
  await page.goto(url, { waitUntil: "load" });
  await waitOpen(page);
  await toBoard(page);
  await settled(page);
  const from = await page.evaluate(() => scrollY);
  const to = await page.evaluate(() => {
    const p = document.querySelector("#journey [class*='page']").getBoundingClientRect();
    return p.bottom + scrollY - innerHeight * 0.6;
  });
  await page.evaluate(
    ([from, to]) =>
      new Promise((done) => {
        const t0 = performance.now();
        const step = (t) => {
          const k = Math.min((t - t0) / 5000, 1);
          const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
          window.__lenis.scrollTo(from + (to - from) * e, { immediate: true, force: true });
          if (k < 1) requestAnimationFrame(step);
          else done();
        };
        requestAnimationFrame(step);
      }),
    [from, to],
  );
  await page.waitForTimeout(2500);
  await context.close();
  const files = await readdir(dir);
  await rename(`${dir}/${files[0]}`, `${outDir}/stamps-1440.webm`);
  await rm(dir, { recursive: true, force: true });
  report.record = `${outDir}/stamps-1440.webm`;
}

// ---------- Reduced motion: settled, silent ----------
if (only.includes("reduced")) {
  const { context, page } = await open("1440x900", { reducedMotion: "reduce" });
  await page.addInitScript(() => localStorage.setItem("jbbru:board-sound", "on"));
  await page.goto(url, { waitUntil: "load" });
  await page.waitForTimeout(1500);
  await page.keyboard.press("Shift"); // unlocks audio
  await page.evaluate(() => document.getElementById("journey").scrollIntoView());
  await page.waitForTimeout(1500);
  const state = await page.evaluate(() => ({
    landed: [...document.querySelectorAll("[data-entry]")].map((e) => e.hasAttribute("data-landed")),
    stampOpacity: [...document.querySelectorAll("[data-stamp]")].map((s) => getComputedStyle(s).opacity),
    animations: document.getAnimations().length,
    played: window.__soundStats?.().played,
    sources: window.__audio.sources,
    oscillators: window.__audio.oscillators,
  }));
  await page.screenshot({ path: `${outDir}/stamps-reduced-motion.png` });
  report.reduced = { ...state, errors: page.errors };
  await context.close();
}

// ---------- Accessibility: the journey list, heading order, both toggles ----------
if (only.includes("a11y")) {
  const { context, page } = await open("1440x900");
  await page.goto(url, { waitUntil: "load" });
  await waitOpen(page);
  await page.evaluate(() => document.getElementById("work").scrollIntoView());
  await page.waitForTimeout(800);
  await page.click("header nav button[aria-expanded]");
  await page.waitForTimeout(400);
  report.a11y = {
    journey: await page.locator("#journey").ariaSnapshot(),
    boardToggle: await page.locator(boardToggle).ariaSnapshot(),
    panelToggle: await page.locator("header nav [aria-label='Sound']").ariaSnapshot(),
    headings: await page.evaluate(() => [...document.querySelectorAll("h1,h2,h3,h4")].map((h) => `${h.tagName} ${h.textContent.trim()}`)),
    contrast: await page.evaluate(() => {
      const panel = getComputedStyle(document.querySelector("#journey [class*='page']")).backgroundColor;
      const pick = (sel) => getComputedStyle(document.querySelector(sel)).color;
      return { panel, country: pick("#journey h3"), period: pick("#journey [class*='period']"), line: pick("#journey [class*='line']") };
    }),
  };
  await context.close();
}

await browser.close();
console.log(JSON.stringify(report, null, 2));
