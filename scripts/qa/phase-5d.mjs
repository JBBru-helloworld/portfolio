// Phase 5d check: the landing's corners (logo, flight deck, altimeter, passenger number), the greeting, and the
// two-page passport, through `pnpm preview`.
// Usage: node scripts/qa/phase-5d.mjs [url] [outDir] [--engine=chrome|webkit] [--only=...] [--sizes=...]
//
// landing   captures (greeting mid-transition and settled) and boxes: nothing overlaps the window, the Scroll
//           cue or each other; the logo's name, colours (rest, hover) and focus ring; the title on the board
// greeting  the morning, afternoon and evening forms (time zones chosen so it is that time there now), the
//           server-rendered fallback, reduced motion (English only, no cycling), CLS over a full cycle, and a
//           recording greeting-<w>.webm of a full cycle
// passport  mid-opening, open with stamps, the phone stack, 400% crops of the crease and of the photo with its
//           ghost, the MRZ lengths, no sideways scroll
// perf      the frame rate during the greeting cycle and the passport opening (1440x900, and 390x844 with 4x
//           CPU, Chrome), and the home page's initial JavaScript compared with Phase 5c
import { mkdir, rename, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { chromium, firefox, webkit } from "playwright";
import { noCounter } from "./no-counter.mjs";

const url = (process.argv[2] ?? "http://localhost:8787/").replace(/\/?$/, "/");
const outDir = process.argv[3] ?? "docs/qa/phase-5d";
const engine = (process.argv.find((a) => a.startsWith("--engine=")) ?? "--engine=chrome").slice(9);
const only = (process.argv.find((a) => a.startsWith("--only=")) ?? "--only=landing,greeting,passport,perf").slice(7).split(",");
const SIZES = {
  "360x800": { width: 360, height: 800, mobile: true },
  "390x844": { width: 390, height: 844, mobile: true },
  "844x390": { width: 844, height: 390, mobile: true },
  "768x1024": { width: 768, height: 1024, mobile: true },
  "1440x900": { width: 1440, height: 900 },
  "1920x1080": { width: 1920, height: 1080 },
  "2560x1440": { width: 2560, height: 1440 },
};
const sizeArg = process.argv.find((a) => a.startsWith("--sizes="));
const pick = (list) => (sizeArg ? sizeArg.slice(8).split(",").filter((s) => list.includes(s)) : list);
await mkdir(outDir, { recursive: true });
const browser = engine === "firefox" ? await firefox.launch() : engine === "chrome" ? await chromium.launch({ channel: "chrome" }) : await webkit.launch();

// Firefox (Phase 7a fixes): no isMobile, and no clipboard permissions (Firefox supports neither).
if (engine === "firefox") {
  const nc = browser.newContext.bind(browser);
  browser.newContext = (o = {}) => nc({ ...o, isMobile: undefined, permissions: (o.permissions ?? []).filter((x) => !x.startsWith("clipboard")) });
}
noCounter(browser);
const report = { engine, url };
const save = () => writeFile(`${outDir}/${engine}-report.json`, JSON.stringify(report, null, 2));

async function open(name, extra = {}, path = "") {
  const vp = SIZES[name];
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.mobile ? 2 : 1,
    hasTouch: !!vp.mobile,
    isMobile: engine === "chrome" ? !!vp.mobile : undefined,
    ...extra,
  });
  // A saved passenger number, so the corner shows without counting again.
  await context.addInitScript(() => {
    try {
      localStorage.setItem("jbbru:passenger", "128");
    } catch {}
  });
  const page = await context.newPage();
  page.errors = [];
  page.on("pageerror", (e) => page.errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && page.errors.push(m.text()));
  await page.goto(url + path, { waitUntil: "load" });
  return { context, page };
}

const boxes = (page) =>
  page.evaluate(() => {
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom) };
    };
    const section = document.querySelector("section");
    const s = getComputedStyle(section);
    // The window frame, from the scene's own geometry (centred, --fw-n of the stage's width).
    const frame = section.querySelector("[class*='frameImg'], [class*='frame']");
    return {
      logo: box(section.querySelector("a[aria-label$=', home']")),
      deck: box(section.querySelector("[class*='deck']")),
      passenger: box(section.querySelector("[class*='passenger']")),
      title: box(section.querySelector("[class*='title']")),
      cue: box(section.querySelector("[class*='cue']")),
      frame: box(frame),
      frameLeftVar: s.getPropertyValue("--frame-left"),
    };
  });

const overlap = (a, b) => a && b && a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;

// ---------- Landing ----------
if (only.includes("landing")) {
  report.landing = {};
  for (const name of pick(["1440x900", "1920x1080", "390x844", "360x800", "844x390"])) {
    const { context, page } = await open(name);
    await page.waitForTimeout(4200);
    const b = await boxes(page);
    // The window frame's left and right edges: the scene's own --frame-left, measured in pixels.
    const frameBox = await page.evaluate(() => {
      const section = document.querySelector("section");
      const probe = document.createElement("div");
      probe.style.cssText = "position:absolute;width:var(--frame-left);height:0;visibility:hidden";
      section.appendChild(probe);
      const fl = probe.getBoundingClientRect().width;
      probe.remove();
      return { l: Math.round(fl), r: Math.round(innerWidth - fl) };
    });
    const clearOfFrame = (box) => !box || box.r <= frameBox.l || box.l >= frameBox.r;
    const pairs = [
      ["deck", "passenger"],
      ["deck", "title"],
      ["deck", "cue"],
      ["passenger", "title"],
      ["passenger", "cue"],
      ["logo", "deck"],
    ];
    const clashes = pairs.filter(([x, y]) => overlap(b[x], b[y])).map((p) => p.join("/"));
    await page.screenshot({ path: `${outDir}/${engine}-landing-${name}-settled.png` });
    // Mid-transition: just after a greeting change (every 2 s).
    await page.waitForFunction(() => document.querySelector("section [class*='greeting'] [class*='word']")?.getAnimations().some((a) => a.playState === "running"), null, { timeout: 6000 }).catch(() => null);
    await page.waitForTimeout(120);
    await page.screenshot({ path: `${outDir}/${engine}-landing-${name}-transition.png` });
    // Beside the window (desktop, landscape) or above or below it (portrait, checked in the captures).
    const portrait = SIZES[name].height > SIZES[name].width;
    report.landing[name] = { boxes: b, frame: frameBox, clearOfFrame: portrait ? "see capture" : clearOfFrame(b.deck) && clearOfFrame(b.passenger) && clearOfFrame(b.title), clashes, sideways: await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), errors: page.errors };
    if (name === "1440x900") {
      const logo = page.locator("section a[aria-label$=', home']");
      const colour = () => logo.evaluate((el) => getComputedStyle(el).color);
      const rest = await colour();
      await logo.hover();
      await page.waitForTimeout(300);
      const hover = await colour();
      await page.mouse.move(700, 450);
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");
      const focus = await page.evaluate(() => {
        const a = document.activeElement;
        return { name: a?.getAttribute("aria-label"), outline: getComputedStyle(a).outlineColor, outlineStyle: getComputedStyle(a).outlineStyle };
      });
      await page.screenshot({ path: `${outDir}/${engine}-logo-focus.png`, clip: { x: 0, y: 0, width: 260, height: 120 } });
      report.landing.logo = { name: await logo.getAttribute("aria-label"), rest, hover, focus, h1: await page.locator("h1").first().textContent(), role: await page.locator("section [class*='role']").first().textContent() };
      // The board's boarding row.
      await page.evaluate(() => document.getElementById("departures").scrollIntoView());
      await page.waitForTimeout(3500);
      report.landing.boardRole = await page.evaluate(() => [...document.querySelectorAll("#departures [data-target]")].map((t) => t.dataset.target).join("").replace(/\s+/g, " ").includes("SOFTWARE & ML ENGINEER"));
      await page.locator("#departures").screenshot({ path: `${outDir}/${engine}-board-role.png` });
    }
    await context.close();
  }
  await save();
}

// ---------- Greeting ----------
const ZONES = ["Pacific/Kiritimati", "Pacific/Auckland", "Asia/Tokyo", "Asia/Kuala_Lumpur", "Asia/Kolkata", "Indian/Mauritius", "Africa/Johannesburg", "Europe/London", "America/Sao_Paulo", "America/New_York", "America/Chicago", "America/Los_Angeles", "Pacific/Honolulu", "Pacific/Pago_Pago"];
const periodOf = (h) => (h >= 5 && h < 12 ? "morning" : h >= 12 && h < 18 ? "afternoon" : "evening");
if (only.includes("greeting")) {
  report.greeting = { periods: {} };
  const byPeriod = {};
  for (const z of ZONES) {
    const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: z }).format(new Date()));
    byPeriod[periodOf(h)] ??= { zone: z, hour: h };
  }
  for (const [period, { zone, hour }] of Object.entries(byPeriod)) {
    const { context, page } = await open("1440x900", { timezoneId: zone });
    await page.waitForTimeout(3600);
    const seen = new Set();
    for (let i = 0; i < 12; i++) {
      seen.add(await page.locator("section [class*='greeting'] [class*='word']").textContent());
      await page.waitForTimeout(2050);
    }
    report.greeting.periods[period] = {
      zone,
      hour,
      sr: await page.locator("section [class*='lines'] .sr-only").textContent(),
      localTime: await page.locator("section [class*='time']").first().textContent(),
      greetings: [...seen],
    };
    await context.close();
  }
  // The server's fallback.
  const html = await (await fetch(url)).text();
  report.greeting.serverHtml = { welcomeAboard: /Welcome aboard/i.test(html), localTimeDashes: html.includes("--:--") };
  // Reduced motion: English only, no cycling.
  {
    const { context, page } = await open("1440x900", { reducedMotion: "reduce" });
    await page.waitForTimeout(1500);
    const seen = new Set();
    for (let i = 0; i < 4; i++) {
      seen.add(await page.locator("section [class*='greeting'] [class*='word']").textContent());
      await page.waitForTimeout(1200);
    }
    report.greeting.reducedMotion = [...seen];
    await context.close();
  }
  // The cycle pauses off screen and while the tab is hidden.
  {
    const { context, page } = await open("1440x900");
    await page.waitForTimeout(4000);
    const word = () => page.locator("section [class*='greeting'] [class*='word']").textContent();
    await page.evaluate(() => {
      const t = document.getElementById("departures").getBoundingClientRect().top + scrollY;
      if (window.__lenis) window.__lenis.scrollTo(t, { immediate: true, force: true });
      else window.scrollTo(0, t);
    });
    await page.waitForTimeout(800);
    const offA = await word();
    await page.waitForTimeout(5000);
    const offB = await word();
    await page.evaluate(() => {
      if (window.__lenis) window.__lenis.scrollTo(0, { immediate: true, force: true });
      else window.scrollTo(0, 0);
    });
    await page.waitForTimeout(800);
    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    const hidA = await word();
    await page.waitForTimeout(5000);
    const hidB = await word();
    report.greeting.pauses = { offScreen: offA === offB, offScreenWords: [offA, offB], tabHidden: hidA === hidB, tabHiddenWords: [hidA, hidB] };
    await context.close();
  }
  // CLS over a full cycle, and the recording.
  {
    const { context, page } = await open("1440x900", { recordVideo: { dir: outDir, size: { width: 1440, height: 900 } } });
    await page.evaluate(() => {
      window.__cls = 0;
      new PerformanceObserver((l) => l.getEntries().forEach((e) => !e.hadRecentInput && (window.__cls += e.value))).observe({ type: "layout-shift", buffered: true });
    });
    await page.waitForTimeout(3600 + 11 * 2050);
    report.greeting.cls = await page.evaluate(() => window.__cls);
    const video = page.video();
    await context.close();
    await rename(await video.path(), `${outDir}/greeting-1440${engine === "chrome" ? "" : "-webkit"}.webm`);
  }
  await save();
}

// ---------- Passport ----------
if (only.includes("passport")) {
  report.passport = {};
  for (const name of pick(["360x800", "390x844", "768x1024", "1440x900", "2560x1440"])) {
    const { context, page } = await open(name, {}, "#work");
    await page.waitForTimeout(2500);
    const spread = SIZES[name].width >= 900;
    // Arrive at the passport by scrolling, so the opening plays.
    await page.evaluate(() => {
      const t = document.getElementById("journey").getBoundingClientRect().top + scrollY - 40;
      if (window.__lenis) window.__lenis.scrollTo(t, { immediate: true, force: true });
      else window.scrollTo(0, t);
    });
    if (spread) {
      await page.waitForFunction(() => document.querySelector("#journey [data-state]")?.dataset.state === "opening", null, { timeout: 4000 }).catch(() => null);
      await page.waitForTimeout(260);
      await page.screenshot({ path: `${outDir}/${engine}-passport-${name}-opening.png` });
    }
    await page.waitForTimeout(3600);
    // Scroll through the section so every stamp lands, then back to its top.
    for (let k = 0; k < 14; k++) {
      await page.mouse.wheel(0, 220);
      await page.waitForTimeout(260);
    }
    await page.waitForTimeout(1200);
    await page.evaluate(() => {
      const t = document.getElementById("journey").getBoundingClientRect().top + scrollY - 40;
      if (window.__lenis) window.__lenis.scrollTo(t, { immediate: true, force: true });
      else window.scrollTo(0, t);
    });
    await page.waitForTimeout(400);
    const shot = async (what) => {
      const box = await page.locator("#journey").evaluate((el) => {
        const r = el.getBoundingClientRect();
        return { x: 0, y: r.top + scrollY, width: document.documentElement.clientWidth, height: r.height };
      });
      await page.screenshot({ path: `${outDir}/${engine}-passport-${name}-${what}.png`, fullPage: true, clip: box });
    };
    await shot("open");
    const info = await page.evaluate(() => ({
      state: document.querySelector("#journey [data-state]")?.dataset.state,
      landed: document.querySelectorAll("#journey [data-landed]").length,
      mrz: [...document.querySelectorAll("#journey [class*='mrz'] span")].map((s) => s.textContent.length),
      mrzFits: [...document.querySelectorAll("#journey [class*='mrz']")].every((m) => m.scrollWidth <= m.clientWidth + 1),
      sideways: document.documentElement.scrollWidth - innerWidth,
      dl: document.querySelectorAll("#journey dl dt").length,
      photoAlt: document.querySelector("#journey [class*='photoBox'] [aria-label], #journey [class*='photoBox'] img")?.getAttribute("aria-label") ?? document.querySelector("#journey [class*='photoBox'] img")?.alt,
    }));
    if (name === "1440x900") {
      // 400% crops: the crease and the photo with its ghost.
      const crease = await page.evaluate(() => {
        const b = document.querySelector("#journey [class*='book']").getBoundingClientRect();
        return { x: Math.round(b.left + b.width / 2 - 40), y: Math.round(b.top + 60), width: 80, height: 80 };
      });
      await page.screenshot({ path: `${outDir}/${engine}-passport-crease-raw.png`, clip: crease });
      const photo = await page.locator("#journey [class*='dataBody']").boundingBox();
      await page.screenshot({ path: `${outDir}/${engine}-passport-photo-raw.png`, clip: { x: photo.x, y: photo.y, width: photo.width, height: photo.height } });
    }
    report.passport[name] = { ...info, errors: page.errors };
    await context.close();
  }
  await save();
}

// ---------- Performance (Chrome) ----------
if (only.includes("perf") && engine === "chrome") {
  report.perf = {};
  const frames = (page) =>
    page.evaluate(() => {
      window.__f = [];
      window.__long = [];
      let last = performance.now();
      const tick = (t) => {
        window.__f.push(t - last);
        last = t;
        window.__raf = requestAnimationFrame(tick);
      };
      window.__raf = requestAnimationFrame(tick);
      new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push(Math.round(e.duration)))).observe({ type: "longtask" });
    });
  const result = (page) =>
    page.evaluate(() => {
      cancelAnimationFrame(window.__raf);
      const f = window.__f.slice(3).sort((a, b) => a - b);
      const total = f.reduce((a, b) => a + b, 0);
      return { frames: f.length, fps: +((f.length / total) * 1000).toFixed(1), p95: +f[Math.floor(f.length * 0.95)].toFixed(1), over33: f.filter((x) => x > 33.4).length, longTasks: window.__long };
    });
  for (const name of ["1440x900", "390x844"]) {
    const { context, page } = await open(name);
    const cdp = await context.newCDPSession(page);
    await page.waitForTimeout(4000);
    if (SIZES[name].mobile) await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await frames(page);
    await page.waitForTimeout(6200);
    const greeting = await result(page);
    let opening = null;
    if (!SIZES[name].mobile) {
      await page.goto(url + "#work", { waitUntil: "load" });
      await page.waitForTimeout(2500);
      await frames(page);
      await page.evaluate(() => {
        const t = document.getElementById("journey").getBoundingClientRect().top + scrollY - 40;
        if (window.__lenis) window.__lenis.scrollTo(t, { immediate: true, force: true });
        else window.scrollTo(0, t);
      });
      await page.waitForTimeout(1600);
      opening = await result(page);
    }
    report.perf[name + (SIZES[name].mobile ? " (4x CPU)" : "")] = { greeting, opening };
    await context.close();
  }
  const html = await (await fetch(url)).text();
  const initial = [...new Set([...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]))];
  let gz = 0;
  for (const src of initial) gz += gzipSync(Buffer.from(await (await fetch(new URL(src, url))).arrayBuffer()), { level: 9 }).length;
  report.js = { homeInitialGzipKB: +(gz / 1024).toFixed(1), phase5cHomeGzipKB: 305.7 };
  await save();
}

console.log(JSON.stringify(report, null, 2));
await save();
await browser.close();
