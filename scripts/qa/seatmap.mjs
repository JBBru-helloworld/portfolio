// The Tech stack seat map (Phase 4b), in Playwright (WebKit, or the installed Chrome with --engine=chrome).
// Usage: node scripts/qa/seatmap.mjs [url] [outDir] [--engine=webkit|chrome]
//          [--only=captures,record,links,keyboard,a11y,reduced,perf]   (perf needs Chrome)
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, firefox, webkit } from "playwright";

const url = (process.argv[2] ?? "http://localhost:8787/").replace(/\/?$/, "/");
const outDir = process.argv[3] ?? "docs/qa/phase-4b";
const engine = (process.argv.find((a) => a.startsWith("--engine=")) ?? "--engine=webkit").slice(9);
const only = (process.argv.find((a) => a.startsWith("--only=")) ?? "--only=captures,record,links,keyboard,a11y,reduced").slice(7).split(",");
const SIZES = {
  "360x800": { width: 360, height: 800, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  "390x844": { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  "768x1024": { width: 768, height: 1024, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  "1024x768": { width: 1024, height: 768, deviceScaleFactor: 1 },
  "1440x900": { width: 1440, height: 900, deviceScaleFactor: 1 },
  "2560x1440": { width: 2560, height: 1440, deviceScaleFactor: 1 },
};
const touch = (name) => !!SIZES[name].hasTouch;
// --sizes=360x800,1440x900 limits the captures to those sizes.
const sizesArg = process.argv.find((a) => a.startsWith("--sizes="));
const captureSizes = sizesArg ? sizesArg.slice(8).split(",") : Object.keys(SIZES);
await mkdir(outDir, { recursive: true });
const browser = engine === "firefox" ? await firefox.launch() : engine === "chrome" ? await chromium.launch({ channel: "chrome" }) : await webkit.launch();

// Firefox (Phase 7a fixes): no isMobile, and no clipboard permissions (Firefox supports neither).
if (engine === "firefox") {
  const nc = browser.newContext.bind(browser);
  browser.newContext = (o = {}) => nc({ ...o, isMobile: undefined, permissions: (o.permissions ?? []).filter((x) => !x.startsWith("clipboard")) });
}
const report = { engine, url };

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

// Restored: no data-restore, and the board covers the scene (under reduced motion there is no pinned
// scene, so only the restore counts).
const restored = (page) =>
  page.waitForFunction(
    () =>
      !document.documentElement.hasAttribute("data-restore") &&
      (matchMedia("(prefers-reduced-motion: reduce)").matches ||
        document.querySelector("section[data-phase]")?.dataset.boardCovered === "true"),
    null,
    { timeout: 30000 },
  );

/** Saves the report so far (a later failure never loses earlier results). */
const save = () => writeFile(`${outDir}/${engine}-report.json`, JSON.stringify(report, null, 2));

/** Scrolls so the element is `top` px below the viewport top (Lenis or native). */
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

const press = async (page, name, selector) => {
  if (touch(name)) await page.locator(selector).tap();
  else await page.locator(selector).click();
};

/** Books a project in the group-booking dropdown (a Radix listbox): open it, choose the option ("none" clears). */
async function book(page, slug, tap = false) {
  const trigger = page.locator("#group-booking");
  if (tap) await trigger.tap();
  else await trigger.click();
  const option = page.locator(`[role=option][data-slug=${slug}]`);
  await option.waitFor();
  if (tap) await option.tap();
  else await option.click();
  await page.waitForTimeout(150);
}

const state = (page) =>
  page.evaluate(() => {
    const sel = document.querySelector("[aria-pressed='true'][id^='seat-']");
    const card = document.querySelector("#seat-card-title");
    const cabin = document.querySelector("[aria-label='Seat map of the tech stack']");
    const r = sel?.getBoundingClientRect();
    return {
      hash: location.hash,
      selected: sel?.id ?? null,
      card: card?.textContent ?? null,
      seatInView: r ? r.top >= 0 && r.bottom <= innerHeight : null,
      covered: document.querySelector("section[data-phase]")?.dataset.boardCovered,
      wide: matchMedia("(orientation: landscape) and (min-width: 1024px) and (pointer: fine), (orientation: landscape) and (min-width: 1280px)").matches,
      entered: cabin?.dataset.entered ?? null,
      sign: [...document.querySelectorAll("header [data-target]")].map((t) => t.dataset.target).join("").trim(),
    };
  });

// ---------- Captures ----------
if (only.includes("captures")) {
  report.captures = {};
  for (const name of captureSizes) {
    const { context, page } = await open(name);
    if (process.env.QA_IO)
      await page.addInitScript(() => {
        const IO = window.IntersectionObserver;
        window.__io = [];
        window.IntersectionObserver = class extends IO {
          constructor(cb, opts) {
            super((es, o) => {
              window.__io.push(es.map((e) => `${e.target.getAttribute("aria-label") ? "CABIN" : e.target.tagName}:${e.isIntersecting}:${Math.round(e.boundingClientRect.top)}`).join(","));
              cb(es, o);
            }, opts);
          }
        };
      });
    const shot = (n) => page.screenshot({ path: `${outDir}/${engine}-${n}-${name}.png` });
    await page.goto(url + "#stack", { waitUntil: "load" });
    await restored(page);
    await place(page, "[aria-label='Seat map of the tech stack']", 120, 1600);
    const enteredAtShot = await page.evaluate(() => document.querySelector("[aria-label='Seat map of the tech stack']").dataset.entered ?? null);
    if (process.env.QA_IO) console.error(name, "IO", await page.evaluate(() => JSON.stringify((window.__io ?? []).filter((x) => x.includes("CABIN")))), "y", await page.evaluate(() => scrollY));
    await shot("cabin");
    const geom = await page.evaluate(() => {
      const seats = [...document.querySelectorAll("[id^='seat-']")].map((s) => s.getBoundingClientRect());
      return { minSeat: Math.round(Math.min(...seats.map((r) => Math.min(r.width, r.height)))), seats: seats.length, scrollWidth: document.documentElement.scrollWidth };
    });
    await press(page, name, "#seat-python");
    await page.waitForTimeout(700);
    await shot("selected");
    const selected = await state(page);
    await book(page, "fraud-detection", touch(name));
    await page.waitForTimeout(500);
    await place(page, "#group-booking", 90, 300);
    await shot("group");
    const group = await page.evaluate(() => ({
      booked: document.querySelectorAll("[data-booked]").length,
      summary: document.querySelector("[aria-live='polite']")?.textContent,
      visibleSummary: document.querySelector("#group-booking")?.parentElement?.querySelector("p")?.textContent,
    }));
    await page.locator("button", { hasText: /^Clear$/ }).click();
    await page.locator("button", { hasText: /^List$/ }).click();
    await page.waitForTimeout(300);
    await place(page, "#stack", 0, 300);
    await shot("list");
    const listShown = await page.evaluate(() => getComputedStyle(document.querySelector("#zone-A").closest("div")).display);
    await page.locator("button", { hasText: /^Seat map$/ }).click();
    report.captures[name] = { ...geom, enteredAtShot, orientation: selected.wide ? "lying (nose left)" : "standing (nose up)", selected, group, listShown, errors: page.errors };
    await context.close();
  }
}

await save();

// ---------- Recordings ----------
if (only.includes("record")) {
  for (const name of ["1440x900", "390x844"]) {
    const vp = SIZES[name];
    const { context, page } = await open(name, { recordVideo: { dir: outDir, size: { width: vp.width, height: vp.height } } });
    await page.goto(url + "#experience", { waitUntil: "load" });
    await restored(page);
    await place(page, "#stack", touch(name) ? 0 : -200, 400);
    // Into view: the entrance.
    await page.evaluate((offset) => {
      const el = document.querySelector("[aria-label='Seat map of the tech stack']");
      const y = el.getBoundingClientRect().top + scrollY - offset;
      if (window.__lenis) window.__lenis.scrollTo(y, { duration: 1.2, force: true });
      else window.scrollTo({ top: y, behavior: "smooth" });
    }, touch(name) ? 140 : 160);
    await page.waitForTimeout(2400);
    for (const id of ["python", "next-js", "postgresql", "lightgbm"]) {
      await press(page, name, `#seat-${id}`);
      await page.waitForTimeout(1100);
      // Phones: close the sheet before the next seat, as a visitor would.
      if (touch(name)) {
        await page.locator("button[aria-label='Close']").tap();
        await page.waitForTimeout(300);
      }
    }
    await book(page, "inklusif", touch(name));
    await page.waitForTimeout(1600);
    await page.locator("button", { hasText: /^Clear$/ }).click();
    await page.waitForTimeout(600);
    await press(page, name, "#seat-fastapi");
    await page.waitForTimeout(900);
    const link = page.locator("section[aria-labelledby='seat-card-title'] a").first();
    if (touch(name)) await link.tap();
    else await link.click();
    await page.waitForURL("**/work/**");
    await page.waitForTimeout(1800);
    await page.goBack();
    await page.waitForURL((u) => u.pathname === "/");
    await page.waitForTimeout(2200);
    const video = page.video();
    await context.close();
    await video.saveAs(`${outDir}/seatmap-${name.split("x")[0]}.webm`);
    await video.delete();
  }
}

await save();

// ---------- Links in ----------
if (only.includes("links")) {
  report.links = {};
  // Every seat by a fresh load of /#seat-<id>.
  {
    const { context, page } = await open("1440x900");
    await page.goto(url, { waitUntil: "load" });
    const ids = await page.evaluate(() => [...document.querySelectorAll("button[id^='seat-']")].map((b) => b.id.slice(5)));
    const bad = [];
    for (const id of ids) {
      // A real fresh load each time (going to the same page with a new fragment is only an in-page jump).
      await page.goto("about:blank");
      await page.goto(`${url}#seat-${id}`, { waitUntil: "load" });
      await restored(page);
      // The seat map hydrates when the load restores into it (Phase 6): wait for the selection, up to 3 s.
      await page.waitForFunction((id) => document.getElementById(id)?.getAttribute("aria-pressed") === "true", `seat-${id}`, { timeout: 3000 }).catch(() => undefined);
      await page.waitForTimeout(250);
      const s = await state(page);
      if (s.selected !== `seat-${id}` || !s.card || !s.seatInView || s.covered !== "true") bad.push({ id, ...s });
    }
    report.links.freshLoads = { checked: ids.length, bad };
    // An in-page jump to a seat (a #seat- link on the page itself): selects it and brings it into view.
    await page.goto(`${url}#stack`, { waitUntil: "load" });
    await restored(page);
    await page.waitForTimeout(400);
    await page.evaluate(() => (location.hash = "#seat-figma"));
    await page.waitForTimeout(500);
    report.links.inPageJump = await state(page);
    await context.close();
  }
  // Every project-page chip points at an existing seat; and chips open the right seat (client-side).
  {
    const { context, page } = await open("1440x900");
    await page.goto(url, { waitUntil: "load" });
    const ids = new Set(await page.evaluate(() => [...document.querySelectorAll("button[id^='seat-']")].map((b) => b.id)));
    const slugs = await page.evaluate(() => [...document.querySelectorAll("#work li[id^='flight-']")].map((li) => li.id.slice(7)));
    const chipProblems = [];
    let chips = 0;
    for (const slug of slugs) {
      const html = await (await fetch(`${url}work/${slug}`)).text();
      for (const m of html.matchAll(/href="\/#(seat-[a-z0-9-]+)"/g)) {
        chips++;
        if (!ids.has(m[1])) chipProblems.push({ slug, href: m[1] });
      }
    }
    const clicks = [];
    for (const [slug, chip] of [["fraud-detection", "LightGBM"], ["touch-n-go-reporting", "ChatGPT"], ["plandora-llm-judge", "TypeScript"]]) {
      await page.goto(`${url}work/${slug}`, { waitUntil: "load" });
      await page.waitForTimeout(500);
      await page.locator("main a", { hasText: new RegExp(`^${chip}$`) }).first().click();
      await page.waitForURL((u) => u.pathname === "/");
      await restored(page);
      await page.waitForTimeout(600);
      clicks.push({ slug, chip, ...(await state(page)) });
    }
    report.links.chips = { pages: slugs.length, chips, chipProblems, clicks };
    // A refresh with a seat selected restores it.
    await page.goto(`${url}#stack`, { waitUntil: "load" });
    await restored(page);
    await place(page, "#seat-docker", 300, 400);
    await page.locator("#seat-docker").click();
    await page.waitForTimeout(400);
    await page.reload({ waitUntil: "load" });
    await restored(page);
    await page.waitForTimeout(500);
    report.links.refresh = await state(page);
    report.links.errors = page.errors;
    await context.close();
  }
}

await save();

// ---------- Keyboard ----------
if (only.includes("keyboard")) {
  report.keyboard = {};
  const tab = engine === "webkit" ? "Alt+Tab" : "Tab";
  for (const name of ["1440x900", "390x844"]) {
    const { context, page } = await open(name);
    await page.goto(url + "#stack", { waitUntil: "load" });
    await restored(page);
    await page.waitForTimeout(600);
    const focused = () => page.evaluate(() => document.activeElement?.id || document.activeElement?.getAttribute("aria-label") || document.activeElement?.tagName);
    // Into the cabin: the select, the two view buttons, then the cabin (one tab stop).
    await page.locator("#group-booking").focus();
    const order = [];
    for (let k = 0; k < 3; k++) {
      await page.keyboard.press(tab);
      order.push(await focused());
    }
    const moves = {};
    for (const key of ["ArrowRight", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowUp", "End", "Home"]) {
      await page.keyboard.press(key);
      moves[`${Object.keys(moves).length}:${key}`] = await focused();
    }
    await page.keyboard.press("ArrowDown");
    const before = await focused();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);
    const afterEnter = await state(page);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    const afterEscape = { ...(await state(page)), focus: await focused() };
    // Leaving the cabin: one Tab goes past all the seats.
    await page.keyboard.press(tab);
    const afterCabin = await focused();
    // Group booking by keyboard: open the listbox with Enter, move with the arrows, choose with Enter.
    await page.locator("#group-booking").focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);
    const activeSlug = () =>
      page.evaluate(() => {
        const list = document.querySelector("[role=listbox]");
        return list ? document.getElementById(list.getAttribute("aria-activedescendant"))?.dataset.slug : null;
      });
    const listbox = { open: await page.evaluate(() => !!document.querySelector("[role=listbox]")), listFocused: await page.evaluate(() => document.activeElement?.getAttribute("role")), active: await activeSlug() };
    for (let k = 0; k < 3; k++) await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(400);
    const group = await page.evaluate(() => ({
      trigger: document.querySelector("#group-booking").textContent,
      booked: document.querySelectorAll("[data-booked]").length,
      focusBack: document.activeElement?.id,
    }));
    group.listbox = listbox;
    // Typeahead: typing "map" jumps to JB 205 Mapetite; Escape closes with focus back on the trigger.
    await page.keyboard.press("Enter");
    await page.waitForTimeout(250);
    await page.keyboard.type("map");
    group.typeahead = await activeSlug();
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    group.afterEscape = await page.evaluate(() => ({ open: !!document.querySelector("[role=listbox]"), focus: document.activeElement?.id }));
    report.keyboard[name] = { orientation: afterEnter.wide ? "lying" : "standing", order, moves, before, afterEnter, afterEscape, afterCabin, group, errors: page.errors };
    await context.close();
  }
}

await save();

// ---------- Accessibility ----------
if (only.includes("a11y")) {
  const { context, page } = await open("1440x900");
  await page.goto(url + "#stack", { waitUntil: "load" });
  await restored(page);
  await page.waitForTimeout(600);
  const snap = {};
  snap.cabinFirstSeats = (await page.locator("[aria-label='Seat map of the tech stack']").ariaSnapshot()).split("\n").slice(0, 12).join("\n");
  await page.locator("#seat-python").click();
  await page.waitForTimeout(300);
  snap.card = await page.locator("section[aria-labelledby='seat-card-title']").ariaSnapshot();
  await page.locator("#group-booking").click();
  await page.waitForTimeout(300);
  snap.listbox = (await page.locator("[role=listbox]").ariaSnapshot()).split("\n").slice(0, 14).join("\n");
  await page.locator("[role=option][data-slug=touch-n-go-reporting]").click();
  await page.waitForTimeout(300);
  snap.trigger = await page.locator("#group-booking").ariaSnapshot();
  snap.groupSummary = await page.evaluate(() => document.querySelector("[aria-live='polite']").textContent);
  await page.locator("button", { hasText: /^List$/ }).click();
  await page.waitForTimeout(200);
  snap.list = (await page.locator("#zone-A").locator("xpath=..").ariaSnapshot()).split("\n").slice(0, 14).join("\n");
  snap.headings = await page.evaluate(() => [...document.querySelectorAll("#stack h2, #stack h3")].map((h) => `${h.tagName} ${h.textContent.trim()}`));
  await page.locator("button", { hasText: /^Seat map$/ }).click();
  // Without JavaScript: the list is the content.
  const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  const p2 = await noJs.newPage();
  await p2.goto(url, { waitUntil: "load" });
  snap.noJs = await p2.evaluate(() => ({
    listDisplay: getComputedStyle(document.querySelector("#zone-A").parentElement.parentElement).display,
    cabinDisplay: getComputedStyle(document.querySelector("[aria-label='Seat map of the tech stack']").closest("div[class*='body']")).display,
    items: document.querySelectorAll("#stack a[href^='#seat-']").length,
  }));
  await noJs.close();
  await writeFile(`${outDir}/${engine}-a11y.json`, JSON.stringify(snap, null, 2));
  report.a11y = { headings: snap.headings, groupSummary: snap.groupSummary, trigger: snap.trigger, noJs: snap.noJs };
  await context.close();
}

await save();

// ---------- Reduced motion ----------
if (only.includes("reduced")) {
  const { context, page } = await open("1440x900", { reducedMotion: "reduce" });
  await page.goto(url + "#stack", { waitUntil: "load" });
  await restored(page);
  await page.waitForTimeout(400);
  const r = await page.evaluate(() => {
    const cabin = document.querySelector("[aria-label='Seat map of the tech stack']");
    const seat = document.querySelector("#seat-python");
    return { entered: cabin.dataset.entered, animation: getComputedStyle(seat).animationName, opacity: getComputedStyle(seat).opacity, transition: getComputedStyle(seat).transitionDuration };
  });
  await book(page, "inklusif");
  await page.waitForTimeout(30);
  r.dimAfter30ms = await page.evaluate(() => getComputedStyle(document.querySelector("#seat-java")).opacity);
  report.reduced = { ...r, errors: page.errors };
  await page.screenshot({ path: `${outDir}/${engine}-reduced-1440x900.png` });
  await context.close();
}

await save();

// ---------- Performance (Chrome) ----------
if (only.includes("perf") && engine === "chrome") {
  report.perf = {};
  for (const name of ["1440x900", "390x844"]) {
    const { context, page } = await open(name);
    const cdp = await context.newCDPSession(page);
    await page.goto(url + "#experience", { waitUntil: "load" });
    await restored(page);
    await page.waitForTimeout(800);
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
    const entrance = await measure(async () => {
      await page.evaluate(() => {
        const el = document.querySelector("[aria-label='Seat map of the tech stack']");
        const y = el.getBoundingClientRect().top + scrollY - 140;
        if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true, force: true });
        else window.scrollTo(0, y);
      });
      await page.waitForTimeout(1800);
    });
    const group = await measure(async () => {
      for (const slug of ["fraud-detection", "inklusif", "budget-tracker", "none"]) {
        await book(page, slug, touch(name));
        await page.waitForTimeout(450);
      }
    });
    report.perf[name + (touch(name) ? " (4x CPU)" : "")] = { entrance, group };
    await context.close();
  }
}

console.log(JSON.stringify(report, null, 2));
await writeFile(`${outDir}/${engine}-report.json`, JSON.stringify(report, null, 2));
await browser.close();
