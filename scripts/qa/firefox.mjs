// The core journey in Playwright's Firefox (Phase 7a): Firefox had never been tested.
// At 390x844 (touch) and 1440x900: the landing (shade, the video Firefox picks, the push, the fly-through, the
// dusk and the curtain rise), the board and its rows, the refresh rules, the passport, the gallery and a project
// page with its transition (or the fallback) and the way back, the seat map, a photo stack, the scanner and
// Duty free. Screenshots of each beat go to outDir.
// Usage: node scripts/qa/firefox.mjs [url] [outDir]
import { mkdir, writeFile } from "node:fs/promises";
import { firefox } from "playwright";
import { noCounter } from "./no-counter.mjs";

const url = (process.argv[2] ?? "http://localhost:8787/").replace(/\/?$/, "/");
const outDir = process.argv[3] ?? "docs/qa/phase-7a/firefox";
await mkdir(outDir, { recursive: true });
const browser = await firefox.launch();
noCounter(browser);
const SIZES = { "390x844": { width: 390, height: 844, touch: true }, "1440x900": { width: 1440, height: 900 } };
const report = { browser: `firefox ${browser.version()}`, sizes: {} };

async function open(s, extra = {}) {
  const context = await browser.newContext({ viewport: { width: s.width, height: s.height }, hasTouch: !!s.touch, ...extra });
  const page = await context.newPage();
  page.errors = [];
  page.on("pageerror", (e) => page.errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && !/40[39]|429/.test(m.text()) && page.errors.push(m.text()));
  return { context, page };
}
const waitOpen = (page) => page.waitForFunction(() => document.querySelector("section[data-phase]")?.dataset.phase === "open", null, { timeout: 30000 });
const restored = (page) => page.waitForFunction(() => !document.documentElement.hasAttribute("data-restore"), null, { timeout: 30000 });
const scene = (page) =>
  page.evaluate(() => {
    const s = document.querySelector("section[data-phase]");
    const op = (sel) => { const el = s.querySelector(sel); return el ? +(+getComputedStyle(el).opacity).toFixed(2) : null; };
    const cam = s.querySelector("[class*='camera']");
    return {
      y: Math.round(scrollY),
      phase: s.dataset.phase,
      covered: s.dataset.covered ?? null,
      boardCovered: s.dataset.boardCovered ?? null,
      cameraScale: cam ? +(new DOMMatrix(getComputedStyle(cam).transform).a).toFixed(2) : null,
      canvas: op("canvas"),
      white: op("[class*='white']"),
      fade: op("[class*='fade']"),
    };
  });
/** Scrolls to a share of the pinned sequence (0..1 of 2.8 or 2.0 screens) the way a visitor does. */
async function seek(page, s, k) {
  const target = await page.evaluate(([k, touch]) => Math.round(k * (touch ? 2.0 : 2.8) * innerHeight), [k, !!s.touch]);
  if (s.touch) await page.evaluate((t) => window.scrollTo(0, t), target);
  else {
    for (let i = 0; i < 200; i++) {
      const now = await page.evaluate(() => scrollY);
      if (now >= target - 20) break;
      await page.mouse.wheel(0, Math.min(200, target - now));
      await page.waitForTimeout(30);
    }
  }
  await page.waitForTimeout(700);
}

for (const [name, s] of Object.entries(SIZES)) {
  const r = {};
  // ---- The landing and the scroll sequence ----
  {
    const { context, page } = await open(s);
    await page.goto(url, { waitUntil: "load" });
    await waitOpen(page);
    await page.waitForTimeout(1500);
    r.landing = await page.evaluate(() => {
      const v = document.querySelector("section[data-phase] video");
      return {
        video: v ? { src: v.currentSrc.replace(location.origin, ""), playing: !v.paused && v.readyState >= 2, time: +v.currentTime.toFixed(2), canAv1: v.canPlayType('video/mp4; codecs="av01.0.05M.08"'), canH264: v.canPlayType('video/mp4; codecs="avc1.42E01E"') } : null,
        shade: (() => { const sh = document.querySelector("section[data-phase] [class*='shade']"); return sh ? getComputedStyle(sh).transform : null; })(),
        h1: document.querySelector("h1")?.textContent,
      };
    });
    await page.screenshot({ path: `${outDir}/${name}-1-landing.png` });
    if (!s.touch) await page.mouse.move(s.width / 2, s.height / 2);
    r.sequence = {};
    for (const k of [0.3, 0.6, 0.8, 0.97]) {
      await seek(page, s, k);
      r.sequence[k] = await scene(page);
      await page.screenshot({ path: `${outDir}/${name}-2-seq-${Math.round(k * 100)}.png` });
    }
    // The curtain rise: on until the board is at the top; the scene must then be covered.
    for (let i = 0; i < 300; i++) {
      const top = await page.evaluate(() => document.getElementById("departures").getBoundingClientRect().top);
      if (top <= 0) break;
      if (s.touch) await page.evaluate(() => window.scrollBy(0, 120));
      else await page.mouse.wheel(0, 120);
      await page.waitForTimeout(30);
    }
    await page.waitForTimeout(2500);
    r.board = { ...(await scene(page)), rows: await page.locator("#departures ol a").count() };
    await page.screenshot({ path: `${outDir}/${name}-3-board.png` });
    // A board row: glide to Selected work.
    const t0 = Date.now();
    await page.locator("#departures a[href='#work']").click();
    await page.waitForFunction(() => Math.abs(document.getElementById("work").getBoundingClientRect().top) < 4, null, { timeout: 8000 }).catch(() => undefined);
    r.boardRow = { ms: Date.now() - t0, workTop: await page.evaluate(() => Math.round(document.getElementById("work").getBoundingClientRect().top)), hash: await page.evaluate(() => location.hash) };
    // The refresh rules: on a section it restores there, covered and with no intro.
    await page.reload({ waitUntil: "load" });
    await restored(page);
    await page.waitForTimeout(800);
    r.reloadOnSection = { workTop: await page.evaluate(() => Math.round(document.getElementById("work").getBoundingClientRect().top)), ...(await scene(page)) };
    r.errors = page.errors;
    await context.close();
  }
  // Reload at the landing: back to the top with the shade open.
  {
    const { context, page } = await open(s);
    await page.goto(url, { waitUntil: "load" });
    await waitOpen(page);
    await page.evaluate(() => window.scrollTo(0, innerHeight * 0.8));
    await page.waitForTimeout(800);
    await page.reload({ waitUntil: "load" });
    await waitOpen(page).catch(() => undefined);
    await page.waitForTimeout(1500);
    r.reloadAtLanding = await scene(page);
    // Scrolling still works after that refresh.
    const y0 = await page.evaluate(() => scrollY);
    if (s.touch) await page.evaluate(() => window.scrollBy(0, 600));
    else for (let i = 0; i < 3; i++) { await page.mouse.move(s.width / 2, s.height / 2); await page.mouse.wheel(0, 300); await page.waitForTimeout(200); }
    await page.waitForTimeout(800);
    r.reloadAtLanding.scrolledBy = Math.round((await page.evaluate(() => scrollY)) - y0);
    r.errors.push(...page.errors);
    await context.close();
  }
  // ---- The sections ----
  {
    const { context, page } = await open(s);
    // The passport.
    await page.goto(url + "#journey", { waitUntil: "load" });
    await restored(page);
    const end = await page.evaluate(() => { const j = document.getElementById("journey"); return j.getBoundingClientRect().bottom + scrollY; });
    for (let y = await page.evaluate(() => scrollY); y < end; y += 250) { await page.evaluate((y) => window.scrollTo(0, y), y); await page.waitForTimeout(300); }
    await page.waitForTimeout(1500);
    r.passport = await page.evaluate(() => ({
      state: document.querySelector("#journey [data-state]")?.dataset.state,
      stampsLanded: [...document.querySelectorAll("#journey [data-entry]")].map((e) => e.hasAttribute("data-landed")),
      photo: (() => { const i = document.querySelector("#journey img"); return i ? i.complete && i.naturalWidth > 0 : null; })(),
      boardCovered: document.querySelector("section[data-phase]").dataset.boardCovered,
    }));
    await page.evaluate(() => document.getElementById("journey").scrollIntoView());
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${outDir}/${name}-4-passport.png` });
    // The gallery and a project page.
    await page.evaluate(() => document.getElementById("work").scrollIntoView());
    await page.waitForTimeout(800);
    const strip = page.locator("#flight-inklusif");
    if (s.touch) { await strip.tap(); await page.waitForTimeout(800); }
    else { await page.locator("#flight-inklusif a").hover(); await page.waitForTimeout(800); }
    r.gallery = { active: await page.evaluate(() => document.querySelector("#work li[data-active='true']")?.id) };
    await page.screenshot({ path: `${outDir}/${name}-5-gallery.png` });
    const vt = await page.evaluate(() => typeof document.startViewTransition === "function");
    if (s.touch) await strip.tap();
    else await page.locator("#flight-inklusif a").click();
    await page.waitForURL("**/work/inklusif", { timeout: 10000 }).catch(() => undefined);
    await page.waitForTimeout(1200);
    r.project = { viewTransitionApi: vt, path: await page.evaluate(() => location.pathname), h1: await page.evaluate(() => document.querySelector("h1")?.textContent), scrollY: await page.evaluate(() => scrollY) };
    await page.screenshot({ path: `${outDir}/${name}-6-project.png` });
    await page.getByRole("link", { name: /Back to all flights/ }).first().click();
    await page.waitForURL((u) => u.pathname === "/", { timeout: 10000 }).catch(() => undefined);
    await page.waitForTimeout(1500);
    r.project.back = { path: await page.evaluate(() => location.pathname), inklusifTop: await page.evaluate(() => Math.round(document.getElementById("flight-inklusif")?.getBoundingClientRect().top ?? -1)), covered: await page.evaluate(() => document.querySelector("section[data-phase]").dataset.boardCovered) };
    // The seat map.
    await page.evaluate(() => document.getElementById("stack").scrollIntoView());
    await page.waitForTimeout(1200);
    await page.locator("#seat-python").click();
    await page.waitForTimeout(700);
    r.seat = await page.evaluate(() => ({ pressed: document.getElementById("seat-python").getAttribute("aria-pressed"), hash: location.hash, card: !!document.querySelector("#stack [role='dialog'], #stack [class*='card'] h3") }));
    await page.screenshot({ path: `${outDir}/${name}-7-seat.png` });
    await page.keyboard.press("Escape");
    // A photo stack.
    await page.evaluate(() => document.getElementById("experience").scrollIntoView());
    await page.waitForTimeout(1500);
    const stack = page.locator("#experience [aria-roledescription='photo stack']").first();
    await stack.scrollIntoViewIfNeeded();
    const before = await stack.locator("[aria-live] [aria-hidden]").textContent();
    await stack.getByRole("button", { name: "Next photo" }).first().click();
    await page.waitForTimeout(900);
    r.photoStack = { before, after: await stack.locator("[aria-live] [aria-hidden]").textContent() };
    // The scanner.
    await page.evaluate(() => document.getElementById("security-check").scrollIntoView());
    await page.waitForTimeout(1500);
    await page.getByRole("button", { name: /^Card testing: small amounts, \$/ }).click();
    await page.waitForFunction(() => document.querySelector('#security-check section[aria-label="Screening report"] [data-verdict]'), null, { timeout: 20000 }).catch(() => undefined);
    await page.waitForTimeout(1500);
    r.scanner = await page.evaluate(() => { const rep = document.querySelector('#security-check section[aria-label="Screening report"]'); return rep ? { verdict: rep.querySelector("[data-verdict]")?.dataset.verdict, percentile: rep.dataset.percentile } : null; });
    await page.screenshot({ path: `${outDir}/${name}-8-scanner.png` });
    // Duty free.
    await page.evaluate(() => document.getElementById("contact").scrollIntoView());
    await page.waitForTimeout(2000);
    r.dutyFree = await page.evaluate(() => ({
      products: document.querySelectorAll("#contact ul > li").length,
      email: document.querySelector("#contact a[href^='mailto:']")?.getAttribute("href") ?? null,
      sideways: document.documentElement.scrollWidth > innerWidth,
    }));
    await page.screenshot({ path: `${outDir}/${name}-9-dutyfree.png` });
    r.errors.push(...page.errors);
    await context.close();
  }
  report.sizes[name] = r;
}
await writeFile(`${outDir}/firefox-report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();
