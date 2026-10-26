// Phase 5c check: the Security check (Gate 3) as served by the site (`pnpm preview`).
// Usage: node scripts/qa/security-check.mjs [url] [outDir] [--engine=chrome|webkit] [--only=...] [--sizes=...]
//
// results   every passenger lands on its expected verdict; five packed bags and ten random passengers show
//           exactly their stored grid results (decoded here from public/security-check/grid/); 30 random
//           presses by verdict; the sliders reach only grid steps; at most one chunk download per scan; a
//           blocked chunk shows the one error message
// objects   for every passenger: no overlaps, sizes follow shares, colours follow direction
// captures  at rest, mid-scan, CLEARED, SCREENING, STOPPED, an object label open, Pack your own bag
// record    security-<width>.webm: two passengers and a packed bag (clicks, or taps on phones)
// a11y      the queue, the form, the report and the live region; a keyboard-only run; reduced motion
// perf      frame rate over a full scan at 1440x900 and at 390x844 with 4x CPU (Chrome); the scanner's own
//           chunk and the home page's initial JavaScript (gzip)
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { join, resolve } from "node:path";
import { chromium, firefox, webkit } from "playwright";
import { noCounter } from "./no-counter.mjs";

const url = (process.argv[2] ?? "http://localhost:8787/").replace(/\/?$/, "/");
const outDir = process.argv[3] ?? "docs/qa/phase-5c";
const engine = (process.argv.find((a) => a.startsWith("--engine=")) ?? "--engine=chrome").slice(9);
const only = (process.argv.find((a) => a.startsWith("--only=")) ?? "--only=results,objects,captures,fullscan,record,a11y,perf").slice(7).split(",");
const SIZES = {
  "360x800": { width: 360, height: 800, hasTouch: true, isMobile: true },
  "390x844": { width: 390, height: 844, hasTouch: true, isMobile: true },
  "768x1024": { width: 768, height: 1024, hasTouch: true },
  "1280x800": { width: 1280, height: 800 },
  "1440x900": { width: 1440, height: 900 },
  "2560x1440": { width: 2560, height: 1440 },
};
const sizeArg = process.argv.find((a) => a.startsWith("--sizes="));
const captureSizes = sizeArg ? sizeArg.slice(8).split(",") : Object.keys(SIZES);
const touch = (name) => !!SIZES[name].hasTouch;

const root = resolve(import.meta.dirname, "../..");
const header = JSON.parse(await readFile(join(root, "src/content/security-check-grid.json"), "utf8"));
const scanner = JSON.parse(await readFile(join(root, "src/content/security-check-scanner.json"), "utf8"));
const chunkCache = new Map();
const chunk = async (name) => {
  if (!chunkCache.has(name)) chunkCache.set(name, JSON.parse(await readFile(join(root, "public", header.path, name), "utf8")));
  return chunkCache.get(name);
};

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

async function open(name, extra = {}) {
  const vp = SIZES[name];
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.isMobile ? 2 : 1,
    hasTouch: !!vp.hasTouch,
    isMobile: engine === "chrome" ? !!vp.isMobile : undefined,
    ...extra,
  });
  const page = await context.newPage();
  page.errors = [];
  page.on("pageerror", (e) => page.errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && !m.text().startsWith("Failed to load resource") && page.errors.push(m.text()));
  page.on("response", (r) => r.status() >= 400 && page.errors.push(`${r.status()} ${r.url().replace(url, "/")}`));
  page.grid = [];
  page.on("request", (r) => r.url().includes("/security-check/grid/") && page.grid.push(r.url().split("/").pop()));
  await page.goto(url + "#security-check", { waitUntil: "load" });
  // The server renders the scanner at rest; wait for its code (data-ready) before pressing anything.
  await page.locator("#security-check [data-ready]").waitFor({ timeout: 15000 });
  await page.waitForTimeout(400);
  return { context, page };
}

const press = (page, name, button) => (touch(name) ? button.tap() : button.click());
const nextButton = (page) => page.getByRole("button", { name: /Next passenger/ });
/** Waits for the run just started to finish (the Next button leaves, then returns). */
async function finished(page) {
  await nextButton(page).waitFor({ state: "hidden", timeout: 8000 });
  await nextButton(page).waitFor({ timeout: 12000 });
}

/** Sends a passenger (by its button) and waits for the sequence to finish. */
async function send(page, name, label) {
  // A passenger's tag is named "<name>, $<amount>, passenger" (Phase 7a fixes): found by the start of its name.
  const role = label.startsWith("Passenger: ")
    ? { name: new RegExp(`^${label.slice(11).replace(/[.$^*+?()[\]{}|\\/]/g, "\\$&")}, \\$`) }
    : { name: label, exact: true };
  await press(page, name, page.getByRole("button", role));
  await finished(page);
}

async function readReport(page) {
  return page.evaluate(() => {
    const r = document.querySelector('#security-check section[aria-label="Screening report"]');
    if (!r) return null;
    return {
      verdict: r.querySelector("[data-verdict]")?.getAttribute("data-verdict"),
      percentile: Number(r.getAttribute("data-percentile")),
      score: Number(r.getAttribute("data-score")),
      objects: [...r.querySelectorAll("li[data-object]")].map((li) => ({
        id: li.getAttribute("data-object"),
        share: Number(li.getAttribute("data-share")),
        direction: li.getAttribute("data-direction"),
      })),
    };
  });
}

async function readTag(page) {
  return page.evaluate(() => {
    const out = {};
    document.querySelectorAll("#security-check dl > div").forEach((d) => (out[d.querySelector("dt").textContent] = d.querySelector("dd").textContent));
    return out;
  });
}

/** The tag's typed values back to a grid cell. */
function cellFromTag(tag) {
  const amount = Number(tag.Value.replace(/[$,]/g, ""));
  const amountStep = header.amount.indexOf(amount);
  const hourBand = tag.Time.replace("TIME BAND ", "").charCodeAt(0) - 65;
  const [net, type] = tag.Class.split(" · ");
  const lower = (v) => v.toLowerCase();
  const choices = {
    product: tag.Product.replace(/^TYPE /, ""),
    network: net === "AMEX" ? "american express" : lower(net),
    card_type: lower(type),
    device: lower(tag.Device),
    distance: lower(tag["From → to"]),
    email: lower(tag.Email),
  };
  return { amountStep, hourBand, choices };
}

/** The stored record for a cell, decoded independently of the site's code. */
async function stored(cell) {
  let index = 0;
  for (const c of header.choices) index = index * c.values.length + c.values.indexOf(cell.choices[c.id]);
  const [v, pct, score, ...shares] = (await chunk(`a-${cell.amountStep}-h-${cell.hourBand}.json`)).records[index];
  return {
    verdict: header.verdicts[v],
    percentile: pct / 10,
    score,
    objects: header.objects
      .map((id, i) => ({ id, share: Math.abs(shares[i]) / 1000, direction: shares[i] > 0 ? "raised" : "lowered" }))
      .sort((a, b) => b.share - a.share),
  };
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

async function setRange(page, index, value) {
  await page.evaluate(
    ([i, v]) => {
      const el = document.querySelectorAll('#security-check input[type="range"]')[i];
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, String(v));
      el.dispatchEvent(new Event("input", { bubbles: true }));
    },
    [index, value],
  );
}

async function pack(page, name, cell, bag = 1) {
  await press(page, name, page.getByRole("button", { name: "PACK YOUR OWN BAG" }));
  await setRange(page, 0, cell.amountStep);
  await setRange(page, 1, cell.hourBand);
  const labels = { distance: "From → to", network: "Card network", card_type: "Card type", device: "Device", email: "Email", product: "Product" };
  // The menus are designed listboxes (Radix Select): open each and choose the value.
  const optionText = (id, v) => (id === "product" ? `TYPE ${v}` : v === "american express" ? "AMEX" : v.toUpperCase());
  for (const [id, label] of Object.entries(labels)) {
    await page.getByRole("combobox", { name: label, exact: true }).click();
    await page.getByRole("option", { name: optionText(id, cell.choices[id]), exact: true }).click();
    await page.getByRole("listbox").waitFor({ state: "detached" });
  }
  await page.locator('#security-check input[name="bag"]').nth(bag).check({ force: true });
}

let seed = 5021;
const rand = (n) => {
  seed = (seed * 1103515245 + 12345) % 2 ** 31;
  return Math.floor((seed / 2 ** 31) * n);
};
const randomCell = () => ({
  amountStep: rand(header.amount.length),
  hourBand: rand(header.hour.length),
  choices: Object.fromEntries(header.choices.map((c) => [c.id, c.values[rand(c.values.length)]])),
});

// ---------- Results ----------
if (only.includes("results")) {
  const name = "1440x900";
  const { context, page } = await open(name);
  const r = (report.results = { presets: [], packed: [], random: [], randomCounts: {}, sliders: null, downloads: [], blocked: null });

  for (const p of scanner.presets) {
    const before = page.grid.length;
    await send(page, name, `Passenger: ${p.name}`);
    const got = await readReport(page);
    r.presets.push({ id: p.id, expected: p.expected, verdict: got.verdict, percentile: got.percentile, ok: got.verdict === p.expected, downloads: page.grid.slice(before) });
  }

  for (let i = 0; i < 5; i++) {
    const cell = randomCell();
    // Downloads count from opening the form: moving the sliders prefetches the bag's chunk.
    const before = page.grid.length;
    await pack(page, name, cell, i % 3);
    await press(page, name, page.getByRole("button", { name: "SEND THROUGH" }));
    await finished(page);
    const got = await readReport(page);
    const want = await stored(cell);
    const tagCell = cellFromTag(await readTag(page));
    r.packed.push({ cell, verdict: got.verdict, percentile: got.percentile, matchesStored: same(got, want), tagMatches: same(tagCell, cell), downloads: page.grid.slice(before) });
  }

  const randomButton = page.getByRole("button", { name: "RANDOM PASSENGER" });
  for (let i = 0; i < 30; i++) {
    const before = page.grid.length;
    await randomButton.hover();
    await press(page, name, randomButton);
    await finished(page);
    const got = await readReport(page);
    r.randomCounts[got.verdict] = (r.randomCounts[got.verdict] ?? 0) + 1;
    if (i < 10) {
      const tag = await readTag(page);
      const want = await stored(cellFromTag(tag));
      r.random.push({ passenger: tag.Passenger, value: tag.Value, time: tag.Time, verdict: got.verdict, percentile: got.percentile, matchesStored: same(got, want), downloads: page.grid.slice(before) });
    } else r.downloads.push(page.grid.length - before);
  }

  // The sliders: integer steps over the grid's steps only; an in-between value snaps.
  await press(page, name, page.getByRole("button", { name: "PACK YOUR OWN BAG" }));
  r.sliders = await page.evaluate(() =>
    [...document.querySelectorAll('#security-check input[type="range"]')].map((el) => {
      const set = (v) => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, String(v));
        return el.value;
      };
      return { min: el.min, max: el.max, step: el.step, setTo2_5: set(2.5), setTo99: set(99), setToMinus3: set(-3) };
    }),
  );
  r.gridSteps = { amount: header.amount, hourBands: header.hour.length };
  r.errors = page.errors;
  await context.close();

  // A blocked chunk: the one error message on the monitor.
  {
    const { context, page } = await open(name);
    await context.route("**/security-check/grid/**/a-5-h-5.json", (route) => route.abort());
    await pack(page, name, { amountStep: 5, hourBand: 5, choices: Object.fromEntries(header.choices.map((c) => [c.id, c.values[0]])) });
    await page.getByRole("button", { name: "SEND THROUGH" }).click();
    const alert = page.locator("#security-check").getByRole("alert");
    await alert.waitFor({ timeout: 12000 });
    r.blocked = { message: await alert.textContent() };
    await page.screenshot({ path: `${outDir}/${engine}-blocked-chunk.png` });
    await context.close();
  }
  await save();
}

// ---------- Objects ----------
if (only.includes("objects")) {
  const name = "1440x900";
  const { context, page } = await open(name);
  report.objects = [];
  for (const p of scanner.presets) {
    await send(page, name, `Passenger: ${p.name}`);
    const o = await page.evaluate(() =>
      [...document.querySelectorAll("#security-check button[data-object]")].map((b) => {
        const r = b.getBoundingClientRect();
        // The colour as sRGB, through a canvas (the computed value may be oklch).
        const ctx = Object.assign(document.createElement("canvas"), { width: 1, height: 1 }).getContext("2d");
        ctx.fillStyle = getComputedStyle(b).color;
        ctx.fillRect(0, 0, 1, 1);
        const c = [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3);
        return { id: b.dataset.object, share: Number(b.dataset.share), direction: b.dataset.direction, x: r.x, y: r.y, w: r.width, h: r.height, color: c };
      }),
    );
    let overlaps = 0;
    for (let i = 0; i < o.length; i++)
      for (let j = i + 1; j < o.length; j++) {
        const a = o[i];
        const b = o[j];
        if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) overlaps++;
      }
    const bySize = [...o].sort((a, b) => b.share - a.share);
    const sizesFollow = bySize.every((x, i) => i === 0 || x.w <= bySize[i - 1].w + 0.5);
    // Amber (raised) is warm: red well above blue. Grey (lowered) is neutral.
    const coloursFollow = o.every((x) => (x.direction === "raised" ? x.color[0] - x.color[2] > 25 : Math.abs(x.color[0] - x.color[2]) < 15));
    report.objects.push({ id: p.id, count: o.length, overlaps, sizesFollow, coloursFollow, sizes: bySize.map((x) => `${x.id} ${Math.round(x.share * 100)}% ${Math.round(x.w)}px ${x.direction}`) });
  }
  await context.close();
  await save();
}

// ---------- Captures ----------
if (only.includes("captures")) {
  report.captures = {};
  for (const name of captureSizes) {
    const { context, page } = await open(name);
    // A full-page capture clipped to the section (element captures of a tall section drift while the page scrolls).
    const shot = async (what) => {
      const box = await page.locator("#security-check").evaluate((el) => {
        const r = el.getBoundingClientRect();
        return { x: 0, y: r.top + window.scrollY, width: document.documentElement.clientWidth, height: r.height };
      });
      await page.screenshot({ path: `${outDir}/${engine}-${name}-${what}.png`, fullPage: true, clip: box });
    };
    await shot("rest");
    await press(page, name, page.getByRole("button", { name: /^Weekly shop, \$/ }));
    // On desktop the stage glides fully into view: queue to belt and tag on one screen, under the header.
    await page.waitForTimeout(1100);
    const fit = await page.evaluate(() => {
      const q = document.querySelector('#security-check ul[aria-label="Passengers"]').getBoundingClientRect();
      const col = document.querySelector("#security-check [data-ready] [class*='stageCol']").getBoundingClientRect();
      const tag = document.querySelector("#security-check [data-ready] [class*='tagWrap']").getBoundingClientRect();
      return { queueTop: Math.round(q.top), stageBottom: Math.round(Math.max(col.bottom, tag.bottom)), viewport: innerHeight };
    });
    fit.fits = fit.queueTop >= 80 && fit.stageBottom <= fit.viewport;
    await page.waitForTimeout(800);
    await shot("mid-scan");
    await nextButton(page).waitFor({ timeout: 12000 });
    await shot("cleared");
    await send(page, name, "Passenger: Duty free, new device");
    await shot("screening");
    await send(page, name, "Passenger: Card testing: small amounts");
    await shot("stopped");
    const first = page.locator("#security-check button[data-object]").first();
    await (touch(name) ? first.tap() : first.hover());
    await page.waitForTimeout(200);
    await shot("label");
    await press(page, name, page.getByRole("button", { name: "PACK YOUR OWN BAG" }));
    await page.waitForTimeout(300);
    await shot("pack");
    report.captures[name] = {
      fit,
      sideways: await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
      queueScrolls: await page.evaluate(() => {
        const q = document.querySelector('#security-check ul[aria-label="Passengers"]').parentElement;
        return q.scrollWidth > q.clientWidth;
      }),
      // Hidden radios count by their label (the bag thumbnail); objects by their hit area (::before).
      smallestTarget: await page.evaluate(() =>
        Math.min(
          ...[...document.querySelectorAll("#security-check button, #security-check select, #security-check input, #security-check a")]
            // Radix's native select mirror is hidden from everyone (aria-hidden, 1 px).
            .filter((e) => !e.closest("[aria-hidden='true']"))
            .map((e) => {
            const target = e.matches("input[type=radio]") ? e.closest("label") : e;
            const r = target.getBoundingClientRect();
            const hit = e.dataset.object ? getComputedStyle(e, "::before") : null;
            return hit ? Math.min(parseFloat(hit.width), parseFloat(hit.height)) : r.width ? Math.min(r.width, r.height) : Infinity;
          }),
        ),
      ),
      errors: page.errors,
    };
    await context.close();
  }
  await save();
}

// ---------- A full scan at 1440x900, as the visitor sees it (viewport frames) ----------
if (only.includes("fullscan")) {
  const name = "1440x900";
  const { context, page } = await open(name);
  await page.getByRole("button", { name: /^Card testing: small amounts, \$/ }).click();
  const t0 = Date.now();
  for (const [label, at] of [["1-drop", 150], ["2-ride", 1000], ["3-scan", 1900], ["4-objects", 2850], ["5-verdict", 3450], ["6-exit", 3800]]) {
    await page.waitForTimeout(Math.max(0, at - (Date.now() - t0)));
    await page.screenshot({ path: `${outDir}/${engine}-fullscan-${label}.png` });
  }
  await nextButton(page).waitFor({ timeout: 12000 });
  await page.screenshot({ path: `${outDir}/${engine}-fullscan-7-done.png` });
  await page.evaluate(() => (window.__lenis ? window.__lenis.scrollTo(window.scrollY + 520, { immediate: true, force: true }) : window.scrollBy(0, 520)));
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${outDir}/${engine}-fullscan-8-report.png` });
  await context.close();
}

// ---------- Recordings ----------
if (only.includes("record")) {
  for (const name of ["1440x900", "390x844"]) {
    const vp = SIZES[name];
    const { context, page } = await open(name, { recordVideo: { dir: outDir, size: { width: vp.width, height: vp.height } } });
    await page.locator("#security-check").evaluate((el) => el.querySelector("ul").scrollIntoView({ block: "start" }));
    await page.waitForTimeout(500);
    await send(page, name, "Passenger: Routine top-up");
    await page.waitForTimeout(800);
    await send(page, name, "Passenger: Far from home, large amount");
    await page.waitForTimeout(800);
    await pack(page, name, { amountStep: 4, hourBand: 0, choices: { product: "C", network: "discover", card_type: "credit", device: "mobile", distance: "unknown", email: "anonymous" } }, 2);
    await page.waitForTimeout(600);
    await press(page, name, page.getByRole("button", { name: "SEND THROUGH" }));
    await nextButton(page).waitFor({ timeout: 12000 });
    await page.waitForTimeout(1200);
    const video = page.video();
    await context.close();
    const { rename } = await import("node:fs/promises");
    await rename(await video.path(), `${outDir}/security-${vp.width}${engine === "chrome" ? "" : "-webkit"}.webm`);
  }
}

// ---------- Accessibility ----------
if (only.includes("a11y")) {
  const name = "1440x900";
  const { context, page } = await open(name);
  report.a11y = { queue: await page.getByRole("list", { name: "Passengers" }).ariaSnapshot() };
  await send(page, name, "Passenger: Card testing: small amounts");
  report.a11y.report = await page.getByRole("region", { name: "Screening report" }).ariaSnapshot();
  report.a11y.live = await page.locator('#security-check [aria-live="polite"]').textContent();
  await page.getByRole("button", { name: "PACK YOUR OWN BAG" }).click();
  report.a11y.form = await page.getByRole("form", { name: "Pack your own bag" }).ariaSnapshot();
  await context.close();

  // Keyboard only: Tab into the queue, Enter, then Tab to the objects (their labels open on focus).
  {
    const { context, page } = await open(name);
    await page.locator("#security-check").focus();
    // Safari moves Tab between form fields only (its default); Option+Tab reaches every control.
    const TAB = engine === "webkit" ? "Alt+Tab" : "Tab";
    const steps = [];
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press(TAB);
      const f = await page.evaluate(() => document.activeElement?.getAttribute("aria-label") ?? document.activeElement?.textContent?.trim());
      steps.push(f);
      if (f?.endsWith(", passenger")) break;
    }
    await page.keyboard.press("Enter");
    await nextButton(page).waitFor({ timeout: 12000 });
    let label = null;
    for (let i = 0; i < 12 && !label; i++) {
      await page.keyboard.press(TAB);
      label = await page.evaluate(() => (document.activeElement?.dataset.object ? document.activeElement.getAttribute("aria-label") : null));
    }
    const shown = await page.evaluate(() => [...document.querySelectorAll("#security-check p[data-side]")].map((p) => p.textContent));
    await page.screenshot({ path: `${outDir}/${engine}-keyboard-label.png` });
    report.a11y.keyboard = { tabsToQueue: steps, focusedObject: label, labelShown: shown };
    await context.close();
  }

  // Reduced motion: nothing moves, the verdict shows at once.
  {
    const { context, page } = await open(name, { reducedMotion: "reduce" });
    const t0 = Date.now();
    await page.getByRole("button", { name: /^Card testing: small amounts, \$/ }).click();
    await page.getByRole("region", { name: "Screening report" }).waitFor({ timeout: 5000 });
    const ms = Date.now() - t0;
    const bag = await page.evaluate(() => {
      const el = document.querySelector("#security-check [class*='bag_']") ?? document.querySelector("#security-check [style*='--aspect']");
      const inSection = document.getAnimations().filter((a) => a.playState === "running" && a.effect?.target?.closest?.("#security-check"));
      return { transform: getComputedStyle(el).transform, running: inSection.map((a) => `${a.animationName ?? a.constructor.name} ${a.effect.getComputedTiming().duration}ms`) };
    });
    await page.screenshot({ path: `${outDir}/${engine}-reduced.png` });
    report.a11y.reducedMotion = { msToReport: ms, bag };
    await context.close();
  }
  await save();
}

// ---------- Performance (Chrome) ----------
if (only.includes("perf") && engine === "chrome") {
  report.perf = {};
  for (const name of ["1440x900", "390x844"]) {
    const { context, page } = await open(name);
    const cdp = await context.newCDPSession(page);
    // A first scan warms the images; the measured one is the second.
    await send(page, name, "Passenger: Weekly shop");
    if (touch(name)) await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await page.evaluate(() => {
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
    await send(page, name, "Passenger: Card testing: small amounts");
    report.perf[name + (touch(name) ? " (4x CPU)" : "")] = await page.evaluate(() => {
      cancelAnimationFrame(window.__raf);
      const f = window.__f.slice(3).sort((a, b) => a - b);
      const total = f.reduce((a, b) => a + b, 0);
      return { frames: f.length, fps: +((f.length / total) * 1000).toFixed(1), p95: +f[Math.floor(f.length * 0.95)].toFixed(1), over33: f.filter((x) => x > 33.4).length, longTasks: window.__long };
    });
    await context.close();
  }

  // JavaScript: the home page's initial scripts, and the scanner's own chunk (loaded when the section is near).
  const html = await (await fetch(url)).text();
  const initial = [...new Set([...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]))];
  let initialGz = 0;
  for (const src of initial) initialGz += gzipSync(Buffer.from(await (await fetch(new URL(src, url))).arrayBuffer()), { level: 9 }).length;
  // Scripts at the top of the page (the section far away), then those a visit to the section adds.
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const top = await context.newPage();
  const atTop = [];
  top.on("response", (r) => r.request().resourceType() === "script" && atTop.push(r.url()));
  await top.goto(url, { waitUntil: "networkidle" });
  await top.waitForTimeout(1500);
  const loadedAtTop = new Set(atTop);
  const page = await context.newPage();
  const lateScripts = [];
  page.on("response", (r) => r.request().resourceType() === "script" && lateScripts.push(r.url()));
  await page.goto(url + "#security-check", { waitUntil: "load" });
  await page.locator("#security-check [data-ready]").waitFor();
  const scannerChunks = [];
  for (const s of new Set(lateScripts)) {
    if (loadedAtTop.has(s)) continue;
    const body = Buffer.from(await (await fetch(s)).arrayBuffer());
    if (body.includes("jbbru:packed-bag")) scannerChunks.push({ file: s.split("/").pop(), gzipKB: +(gzipSync(body, { level: 9 }).length / 1024).toFixed(1) });
  }
  report.js = {
    homeInitialGzipKB: +(initialGz / 1024).toFixed(1),
    phase4cHomeGzipKB: 302,
    scannerChunk: scannerChunks,
    scannerNotInInitial: scannerChunks.length > 0 && !initial.some((s) => scannerChunks.some((c) => s.endsWith(c.file))),
    scannerNotLoadedAtTop: scannerChunks.length > 0 && ![...loadedAtTop].some((s) => scannerChunks.some((c) => s.endsWith(c.file))),
  };
  await context.close();
  await save();
}

console.log(JSON.stringify(report, null, 2));
await save();
await browser.close();
