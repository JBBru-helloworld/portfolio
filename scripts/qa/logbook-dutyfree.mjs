// Experience (the logbook and its photo stacks), Contact (Duty free) and the footer (Phase 4c), in Playwright
// (WebKit, or the installed Chrome with --engine=chrome).
// Usage: node scripts/qa/logbook-dutyfree.mjs [url] [outDir] [--engine=webkit|chrome]
//          [--only=captures,record,stacks,contact,footer,a11y,perf]   (perf needs Chrome)
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, webkit } from "playwright";

const url = (process.argv[2] ?? "http://localhost:8787/").replace(/\/?$/, "/");
const outDir = process.argv[3] ?? "docs/qa/phase-4c";
const engine = (process.argv.find((a) => a.startsWith("--engine=")) ?? "--engine=webkit").slice(9);
const only = (process.argv.find((a) => a.startsWith("--only=")) ?? "--only=captures,record,stacks,contact,footer,a11y").slice(7).split(",");
const SIZES = {
  "360x800": { width: 360, height: 800, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  "390x844": { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  "768x1024": { width: 768, height: 1024, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  "1440x900": { width: 1440, height: 900, deviceScaleFactor: 1 },
  "2560x1440": { width: 2560, height: 1440, deviceScaleFactor: 1 },
};
const touch = (name) => !!SIZES[name].hasTouch;
await mkdir(outDir, { recursive: true });
const browser = engine === "chrome" ? await chromium.launch({ channel: "chrome" }) : await webkit.launch();
const report = { engine, url };
const save = () => writeFile(`${outDir}/${engine}-report.json`, JSON.stringify(report, null, 2));

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

const restored = (page) =>
  page.waitForFunction(
    () =>
      !document.documentElement.hasAttribute("data-restore") &&
      (matchMedia("(prefers-reduced-motion: reduce)").matches || document.querySelector("section[data-phase]")?.dataset.boardCovered === "true"),
    null,
    { timeout: 30000 },
  );

/** Scrolls so the element's top is `top` px below the viewport top (Lenis or native). */
async function place(page, selector, top = 100, settle = 500) {
  await page.evaluate(
    ([sel, top]) => {
      const el = document.querySelector(sel);
      const y = el.getBoundingClientRect().top + scrollY - top;
      if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true, force: true });
      else window.scrollTo(0, y);
    },
    [selector, top],
  );
  await page.waitForTimeout(settle);
}

/** Scrolls through a section in steps so its entrances run, as a visitor's scroll would. */
async function scrollThrough(page, selector, step = 500, pause = 350) {
  const { top, height } = await page.evaluate((sel) => {
    const r = document.querySelector(sel).getBoundingClientRect();
    return { top: r.top + scrollY, height: r.height };
  }, selector);
  for (let y = top - 200; y < top + height; y += step) {
    await page.evaluate((y) => (window.__lenis ? window.__lenis.scrollTo(y, { immediate: true, force: true }) : window.scrollTo(0, y)), y);
    await page.waitForTimeout(pause);
  }
}

const STACK = "#experience [aria-roledescription='photo stack']";

/** Counts each stack's flicks over `ms` by sampling the counters every 250 ms (a 2-photo stack flicked twice is back to 1). */
async function countFlicks(page, ms = 9000) {
  const read = () => page.evaluate((sel) => [...document.querySelectorAll(sel)].map((s) => s.querySelector("[aria-live] [aria-hidden]")?.textContent), STACK);
  let last = await read();
  const flicks = last.map(() => 0);
  for (let t = 0; t < ms; t += 250) {
    await page.waitForTimeout(250);
    const now = await read();
    now.forEach((c, i) => c !== last[i] && flicks[i]++);
    last = now;
  }
  return flicks;
}
const stacks = (page) =>
  page.evaluate((sel) => [...document.querySelectorAll(sel)].map((s) => ({ label: s.getAttribute("aria-label"), counter: s.querySelector("[aria-live] [aria-hidden]")?.textContent, button: s.querySelector("button[aria-label$='photos']")?.getAttribute("aria-label") })), STACK);

// ---------- Captures ----------
if (only.includes("captures")) {
  report.captures = {};
  for (const name of Object.keys(SIZES)) {
    const { context, page } = await open(name);
    const shot = (n) => page.screenshot({ path: `${outDir}/${engine}-${n}-${name}.png` });
    await page.goto(url + "#experience", { waitUntil: "load" });
    await restored(page);
    await scrollThrough(page, "#experience table");
    await place(page, "#experience", 0, 600);
    await shot("logbook");
    const geom = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      rows: document.querySelectorAll("#experience tbody tr").length,
      revealed: document.querySelectorAll("#experience [data-revealed]").length,
      table: getComputedStyle(document.querySelector("#experience table")).display,
    }));
    // A stack mid-flick.
    await place(page, STACK, 160, 300);
    const first = page.locator(STACK).first();
    if (touch(name)) await first.locator("button").first().tap();
    else await first.locator("button").first().click();
    await page.waitForTimeout(230);
    await shot("stack-midflick");
    await page.waitForTimeout(600);
    await place(page, "#experience h3", 80, 300);
    await shot("ratings");
    await page.goto(url + "#contact", { waitUntil: "load" });
    await restored(page);
    await scrollThrough(page, "#contact ul");
    await place(page, "#contact", 0, 700);
    await shot("dutyfree");
    const product = page.locator("#contact a[aria-label^='LinkedIn']");
    if (touch(name)) await product.focus();
    else await product.hover();
    await page.waitForTimeout(400);
    await shot("dutyfree-hover");
    const hover = await product.evaluate((a) => ({
      action: getComputedStyle(a.querySelector("[class*='tagAction']")).color,
      lift: getComputedStyle(a.querySelector("svg")).transform,
    }));
    await place(page, "footer", 200, 300);
    await shot("footer");
    report.captures[name] = { ...geom, hover, contactScrollWidth: await page.evaluate(() => document.documentElement.scrollWidth), errors: page.errors };
    await context.close();
  }
  await save();
}

// ---------- Recordings ----------
if (only.includes("record")) {
  {
    const vp = SIZES["1440x900"];
    const { context, page } = await open("1440x900", { recordVideo: { dir: outDir, size: { width: vp.width, height: vp.height } } });
    await page.goto(url + "#stack", { waitUntil: "load" });
    await restored(page);
    await page.waitForTimeout(500);
    await scrollThrough(page, "#experience table", 260, 450);
    await place(page, `${STACK}`, 220, 9500); // the stack flicks by itself, twice
    await page.locator(STACK).first().hover(); // pauses
    await page.waitForTimeout(5200);
    const video = page.video();
    await context.close();
    await video.saveAs(`${outDir}/logbook-1440.webm`);
    await video.delete();
  }
  {
    const vp = SIZES["390x844"];
    const { context, page } = await open("390x844", { recordVideo: { dir: outDir, size: { width: vp.width, height: vp.height } } });
    await page.goto(url + "#experience", { waitUntil: "load" });
    await restored(page);
    await page.waitForTimeout(400);
    await scrollThrough(page, "#contact ul", 220, 500);
    await place(page, "#contact ul", 90, 900);
    for (const label of ["LinkedIn", "GitHub", "Instagram"]) {
      const [popup] = await Promise.all([page.waitForEvent("popup", { timeout: 8000 }).catch(() => null), page.locator(`#contact a[aria-label^='${label}']`).tap()]);
      await page.waitForTimeout(700);
      await popup?.close();
      await page.waitForTimeout(400);
    }
    await page.locator("#contact button[aria-label='Copy the email address']").tap();
    await page.waitForTimeout(2200);
    const video = page.video();
    await context.close();
    await video.saveAs(`${outDir}/dutyfree-390.webm`);
    await video.delete();
  }
}

// ---------- Photo stacks ----------
if (only.includes("stacks")) {
  report.stacks = {};
  for (const name of ["1440x900", "390x844"]) {
    const { context, page } = await open(name);
    await page.goto(url + "#experience", { waitUntil: "load" });
    await restored(page);
    await scrollThrough(page, "#experience table");
    const r = {};
    // One stack at a time: with the first stack's entry most in view, only it advances.
    await place(page, `${STACK}`, name === "1440x900" ? 260 : 160, 200);
    await page.mouse.move(2, 2);
    r.oneAtATime = { flicksIn9s: await countFlicks(page), active: await page.evaluate((sel) => [...document.querySelectorAll(sel)].map((s) => !!s.dataset.active), STACK) };
    // Off screen: nothing advances.
    await place(page, "#contact", 0, 200);
    r.offScreen = { flicksIn9s: await countFlicks(page) };
    // Hidden tab: nothing advances.
    await place(page, `${STACK}`, name === "1440x900" ? 260 : 160, 200);
    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    r.hiddenTab = { flicksIn9s: await countFlicks(page) };
    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    // Pause on hover or tap, manual flick, counter, play.
    const first = page.locator(STACK).first();
    if (touch(name)) await first.locator("button").first().tap();
    else await first.hover();
    await page.waitForTimeout(400);
    r.afterInteract = (await stacks(page))[0];
    r.pausedFlicksIn5s = (await countFlicks(page, 5000))[0];
    if (!touch(name)) {
      await first.locator("button").first().click();
      await page.waitForTimeout(700);
      r.afterManualClick = (await stacks(page))[0];
    }
    await first.focus();
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(700);
    r.afterArrow = (await stacks(page))[0];
    await first.locator("button[aria-label='Play photos']").click();
    await page.mouse.move(2, 2);
    r.afterPlay = { button: (await stacks(page))[0].button, flicksIn5s: (await countFlicks(page, 5000))[0] };
    r.errors = page.errors;
    report.stacks[name] = r;
    await context.close();
  }
  // Reduced motion: never advances by itself; a manual flick swaps at once.
  {
    const { context, page } = await open("1440x900", { reducedMotion: "reduce" });
    await page.goto(url + "#experience", { waitUntil: "load" });
    await restored(page);
    await place(page, `${STACK}`, 260, 200);
    await page.mouse.move(2, 2);
    const flicks = await countFlicks(page);
    await page.locator(STACK).first().locator("button").first().click();
    await page.waitForTimeout(40);
    const manual = await page.evaluate((sel) => ({ counter: document.querySelector(sel).querySelector("[aria-live] [aria-hidden]").textContent, flicking: !!document.querySelector(`${sel} [data-flick]`) }), STACK);
    report.stacks.reduced = { flicksIn9s: flicks, manual, errors: page.errors };
    await context.close();
  }
  await save();
}

// ---------- Contact: email, Copy, links ----------
if (only.includes("contact")) {
  const html = await (await fetch(url)).text();
  report.contact = {
    serverHtml: { fullAddress: html.includes("jb.brubusiness3@gmail.com"), mailto: html.includes("mailto:"), noscriptFallback: html.includes("jb.brubusiness3 [at] gmail.com") },
  };
  for (const name of ["1440x900", "390x844"]) {
    const { context, page } = await open(name, engine === "chrome" ? { permissions: ["clipboard-read", "clipboard-write"] } : {});
    await page.goto(url + "#contact", { waitUntil: "load" });
    await restored(page);
    await scrollThrough(page, "#contact ul");
    const email = await page.evaluate(() => document.querySelector("#contact a[aria-label^='Email']")?.getAttribute("href"));
    const btn = page.locator("#contact button[aria-label='Copy the email address']");
    if (touch(name)) await btn.tap();
    else await btn.click();
    await page.waitForTimeout(900);
    const label = await btn.evaluate((b) => [...b.querySelectorAll("[data-target]")].map((t) => t.dataset.target).join("").trim());
    let clipboard = null;
    try {
      clipboard = await page.evaluate(() => navigator.clipboard.readText());
    } catch (e) {
      clipboard = `not readable in this browser (${String(e).slice(0, 60)})`;
    }
    await page.waitForTimeout(2600);
    const labelLater = await btn.evaluate((b) => [...b.querySelectorAll("[data-target]")].map((t) => t.dataset.target).join("").trim());
    const linksOut = await page.evaluate(() =>
      [...document.querySelectorAll("#contact a")].map((a) => ({ name: a.getAttribute("aria-label")?.split(" (")[0].split(":")[0], href: a.getAttribute("href"), target: a.target, rel: a.rel })),
    );
    report.contact[name] = { email, labelAfterCopy: label, clipboard, labelLater, links: linksOut, errors: page.errors };
    await context.close();
  }
  await save();
}

// ---------- Footer: back to the window ----------
if (only.includes("footer")) {
  const { context, page } = await open("1440x900");
  await page.goto(url + "#contact", { waitUntil: "load" });
  await restored(page);
  await place(page, "footer", 300, 400);
  await page.addInitScript(() => {
    window.__phases = [];
    const watch = () => {
      const s = document.querySelector("section[data-phase]");
      if (!s) return requestAnimationFrame(watch);
      window.__phases.push(s.dataset.phase);
      new MutationObserver(() => window.__phases.at(-1) !== s.dataset.phase && window.__phases.push(s.dataset.phase)).observe(s, { attributes: true, attributeFilter: ["data-phase"] });
    };
    watch();
  });
  await page.locator("footer a", { hasText: "Back to the window" }).click();
  await page.waitForURL((u) => u.pathname === "/" && !u.hash);
  await page.waitForTimeout(3500);
  report.footer = {
    afterBack: await page.evaluate(() => ({ y: scrollY, path: location.pathname + location.hash, phases: window.__phases })),
    texts: await page.evaluate(() => [...document.querySelectorAll("footer p, footer a")].map((e) => e.textContent.trim())),
    errors: page.errors,
  };
  await context.close();
  await save();
}

// ---------- Accessibility ----------
if (only.includes("a11y")) {
  const { context, page } = await open("1440x900");
  await page.goto(url + "#experience", { waitUntil: "load" });
  await restored(page);
  await scrollThrough(page, "#experience table");
  const snap = {};
  snap.logbookTable = (await page.locator("#experience table").ariaSnapshot()).split("\n").slice(0, 40).join("\n");
  snap.stack = await page.locator(STACK).first().ariaSnapshot();
  snap.ratings = (await page.locator("#experience ul").last().ariaSnapshot()).split("\n").slice(0, 10).join("\n");
  await page.goto(url + "#contact", { waitUntil: "load" });
  await restored(page);
  await scrollThrough(page, "#contact ul");
  snap.dutyFree = await page.locator("#contact").ariaSnapshot();
  snap.footer = await page.locator("footer").ariaSnapshot();
  snap.headings = await page.evaluate(() => [...document.querySelectorAll("#experience h2, #experience h3, #contact h2, #contact h3")].map((h) => `${h.tagName} ${h.textContent.trim()}`));
  await writeFile(`${outDir}/${engine}-a11y.json`, JSON.stringify(snap, null, 2));
  report.a11y = { headings: snap.headings };
  await context.close();
  // Reduced motion: no entrances (everything shown at once).
  const rm = await open("1440x900", { reducedMotion: "reduce" });
  await rm.page.goto(url + "#experience", { waitUntil: "load" });
  await restored(rm.page);
  await rm.page.waitForTimeout(500);
  report.a11y.reduced = await rm.page.evaluate(() => ({
    logbook: document.querySelector("#experience [data-reveal-group]")?.dataset.revealGroup,
    dutyFree: document.querySelector("#contact [data-reveal-group]")?.dataset.revealGroup,
    hiddenRows: [...document.querySelectorAll("#experience tbody tr")].filter((r) => getComputedStyle(r).opacity !== "1").length,
  }));
  await rm.context.close();
  // Without JavaScript: the logbook and the shelves are all there.
  const nojs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  const p3 = await nojs.newPage();
  await p3.goto(url, { waitUntil: "load" });
  report.a11y.noJs = await p3.evaluate(() => ({
    rows: [...document.querySelectorAll("#experience tbody tr")].filter((r) => getComputedStyle(r).opacity === "1").length,
    products: [...document.querySelectorAll("#contact li")].filter((r) => getComputedStyle(r).opacity === "1").length,
    emailFallback: !!document.querySelector("#contact noscript"),
  }));
  await nojs.close();
  await save();
}

// ---------- Performance (Chrome) ----------
if (only.includes("perf") && engine === "chrome") {
  report.perf = {};
  for (const name of ["1440x900", "390x844"]) {
    const { context, page } = await open(name);
    const cdp = await context.newCDPSession(page);
    await page.goto(url + "#stack", { waitUntil: "load" });
    await restored(page);
    await page.waitForTimeout(600);
    if (touch(name)) await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    const measure = async (action) => {
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
      await action();
      return page.evaluate(() => {
        cancelAnimationFrame(window.__raf);
        const f = window.__f.slice(3).sort((a, b) => a - b);
        const total = f.reduce((a, b) => a + b, 0);
        return { frames: f.length, fps: +((f.length / total) * 1000).toFixed(1), p95: +f[Math.floor(f.length * 0.95)].toFixed(1), over33: f.filter((x) => x > 33.4).length, longTasks: window.__long };
      });
    };
    const writeIn = await measure(() => scrollThrough(page, "#experience table", 220, 300));
    await place(page, STACK, 200, 300);
    const flick = await measure(async () => {
      for (let k = 0; k < 4; k++) {
        await page.locator(STACK).first().locator("button").first().click();
        await page.waitForTimeout(650);
      }
    });
    const settle = await measure(() => scrollThrough(page, "#contact ul", 220, 300));
    report.perf[name + (touch(name) ? " (4x CPU)" : "")] = { writeIn, flick, settle };
    await context.close();
  }
  await save();
}

console.log(JSON.stringify(report, null, 2));
await save();
await browser.close();
