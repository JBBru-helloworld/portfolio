// Selected work and the project pages (Phase 4a): navigation and restore, captures, recordings,
// accessibility and reduced motion, in Playwright (WebKit, or the installed Chrome with --engine=chrome).
// Usage: node scripts/qa/work.mjs [url] [outDir] [--engine=webkit|chrome] [--only=nav,wrap,captures,record,a11y,reduced,perf]
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, firefox, webkit } from "playwright";

const url = (process.argv[2] ?? "http://localhost:8787/").replace(/\/?$/, "/");
const outDir = process.argv[3] ?? "docs/qa/phase-4a";
const engine = (process.argv.find((a) => a.startsWith("--engine=")) ?? "--engine=webkit").slice(9);
const only = (process.argv.find((a) => a.startsWith("--only=")) ?? "--only=nav,wrap,captures,record,a11y,reduced").slice(7).split(",");
const SIZES = {
  "360x800": { width: 360, height: 800, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  "390x844": { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  "768x1024": { width: 768, height: 1024, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  "1440x900": { width: 1440, height: 900, deviceScaleFactor: 1 },
  "2560x1440": { width: 2560, height: 1440, deviceScaleFactor: 1 },
};
const touch = (name) => !!SIZES[name].hasTouch;
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
    isMobile: engine === "chrome" ? vp.isMobile ?? false : vp.isMobile ?? false,
    hasTouch: vp.hasTouch ?? false,
    ...extra,
  });
  const page = await context.newPage();
  page.errors = [];
  page.on("pageerror", (e) => page.errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && page.errors.push(m.text()));
  return { context, page };
}

/** Waits until the home page has restored (no data-restore) and, if covered is wanted, the board covers the scene. */
const restored = (page) =>
  page.waitForFunction(
    () => !document.documentElement.hasAttribute("data-restore") && document.querySelector("section[data-phase]")?.dataset.boardCovered === "true",
    null,
    { timeout: 20000 },
  );

/** Puts an element `top` px below the viewport top (Lenis or native), then lets things settle. */
async function place(page, selector, top = 160, settle = 500) {
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

/** Records the shade phases on the home page from now on (to prove no intro plays on a return). */
const watchPhases = (page) =>
  page.evaluate(() => {
    window.__phaseLog = [];
    const tick = () => {
      const p = document.querySelector("section[data-phase]")?.dataset.phase ?? "none";
      if (window.__phaseLog.at(-1) !== p) window.__phaseLog.push(p);
      window.__phaseTimer = requestAnimationFrame(tick);
    };
    tick();
  });

// Taps land on the centre of the visible strip (its <li>): a link's box includes its clipped open-state image,
// so the link's own centre can sit over a later strip.
const strip = (page, selector) => page.locator(selector).locator("xpath=ancestor::li[1]");

async function activate(page, name, selector) {
  if (touch(name)) {
    await strip(page, selector).tap();
    await page.waitForTimeout(500);
    await strip(page, selector).tap();
  } else {
    await page.locator(selector).hover();
    await page.waitForTimeout(450);
    await page.locator(selector).click();
  }
}

const homeState = (page, id) =>
  page.evaluate((id) => {
    const s = document.querySelector("section[data-phase]");
    const el = document.getElementById(id);
    return {
      path: location.pathname + location.hash,
      top: Math.round(el.getBoundingClientRect().top),
      covered: s?.dataset.boardCovered,
      phase: s?.dataset.phase,
      phases: window.__phaseLog ?? null,
      expanded: el.hasAttribute("data-active") || null,
      hudHidden: document.documentElement.hasAttribute("data-restore"),
    };
  }, id);

// ---------- Navigation and restore ----------
if (only.includes("nav")) {
  report.nav = {};
  for (const name of ["1440x900", "390x844"]) {
    const { context, page } = await open(name);
    const r = {};
    await page.goto(url + "#work", { waitUntil: "load" });
    await restored(page);
    await page.waitForTimeout(600);

    // 1. Open a featured flight from the gallery (Inklusif), with the transition.
    await place(page, "#flight-inklusif", touch(name) ? 220 : 120);
    await page.evaluate(() => {
      window.__vtSeen = false;
      new MutationObserver(() => document.documentElement.dataset.flight && (window.__vtSeen = document.documentElement.dataset.flight)).observe(
        document.documentElement,
        { attributes: true, attributeFilter: ["data-flight"] },
      );
    });
    await activate(page, name, "#flight-inklusif a");
    await page.waitForURL("**/work/inklusif");
    await page.waitForTimeout(900);
    r.open = {
      url: new URL(page.url()).pathname,
      origin: await page.evaluate(() => JSON.parse(sessionStorage.getItem("jbbru:work-origin"))),
      viewTransitionApi: await page.evaluate(() => typeof document.startViewTransition === "function"),
      transition: await page.evaluate(() => window.__vtSeen),
      h1: await page.locator("h1").textContent(),
      sign: await page.evaluate(() => document.querySelector("header button .sr-only")?.textContent),
      scrollY: await page.evaluate(() => scrollY),
    };

    // 2. Next flight twice.
    const nexts = [];
    for (let k = 0; k < 2; k++) {
      await page.locator("nav[aria-label='More flights'] a").nth(1).click();
      await page.waitForURL((u) => !u.pathname.endsWith(nexts.at(-1) ?? "/work/inklusif"));
      await page.waitForTimeout(500);
      nexts.push(new URL(page.url()).pathname);
    }
    r.next = nexts;

    // 3. Back to all flights: the gallery strip exactly where it was, covered, no intro, still expanded.
    await page.evaluate(() => (window.__returning = true));
    await page.locator("nav[aria-label='More flights'] a", { hasText: "Back to all flights" }).click();
    await page.waitForURL((u) => u.pathname === "/");
    await watchPhases(page);
    await restored(page);
    await page.waitForTimeout(700);
    // The origin is where the strip was at the click (stored then); the return must land it there again.
    r.backToAll = { originTop: r.open.origin?.offset, ...(await homeState(page, "flight-inklusif")) };

    // 4. The browser's back button from a manifest row's page.
    await place(page, "#flight-grab-buddy", 300);
    await page.locator("#flight-grab-buddy a").click();
    await page.waitForURL("**/work/grab-buddy");
    const rowTop = await page.evaluate(() => JSON.parse(sessionStorage.getItem("jbbru:work-origin")).offset);
    await page.waitForTimeout(700);
    await page.goBack();
    await page.waitForURL((u) => u.pathname === "/");
    await watchPhases(page);
    await restored(page);
    await page.waitForTimeout(700);
    r.browserBack = { originTop: rowTop, ...(await homeState(page, "flight-grab-buddy")) };

    // 5. A corner-sign link from a project page lands on that section, covered.
    await page.goForward();
    await page.waitForURL("**/work/grab-buddy");
    await page.waitForTimeout(600);
    await page.locator("header button").click();
    await page.waitForTimeout(400);
    await page.locator("[role='dialog'] a[href='/#journey']").click();
    await page.waitForURL((u) => u.pathname === "/");
    await restored(page);
    await page.waitForTimeout(600);
    r.cornerToSection = await homeState(page, "journey");

    // 6. All the way up: the scene plays, clipped to the window, the camera pushing.
    const g = await page.evaluate(() => {
      const s = document.querySelector("section[data-phase]");
      const t = matchMedia("(hover: none) and (pointer: coarse)").matches;
      return { d: (t ? 2.0 : 2.8) * s.clientHeight };
    });
    for (const f of [0.6, 0.4, 0.25]) {
      await page.evaluate((y) => (window.__lenis ? window.__lenis.scrollTo(y, { immediate: true, force: true }) : scrollTo(0, y)), Math.round(g.d * f));
      await page.waitForTimeout(350);
    }
    r.sceneAfterReturn = await page.evaluate(() => {
      const s = document.querySelector("section[data-phase]");
      return {
        clip: s.querySelector("canvas").style.clipPath.slice(0, 8),
        cameraScale: +new DOMMatrix(getComputedStyle(s.querySelector("[class*='camera']")).transform).a.toFixed(2),
        covered: s.dataset.boardCovered,
      };
    });
    await page.screenshot({ path: `${outDir}/${engine}-scene-after-return-${name}.png` });

    // 7. A refresh on a project page stays on it, at the top.
    await page.goto(url + "work/pengyou", { waitUntil: "load" });
    await page.reload({ waitUntil: "load" });
    await page.waitForTimeout(500);
    r.refresh = { url: new URL(page.url()).pathname, h1: await page.locator("h1").textContent(), restoreAttr: await page.evaluate(() => document.documentElement.hasAttribute("data-restore")) };

    r.errors = page.errors;
    report.nav[name] = r;
    await context.close();
  }
}

// ---------- Previous and Next wrap around all 17 ----------
if (only.includes("wrap")) {
  const html = await (await fetch(url)).text();
  const order = [...html.matchAll(/<li[^>]*\bid="flight-([a-z0-9-]+)"/g)].map((m) => m[1]);
  const pages = {};
  for (const slug of order) {
    const h = await (await fetch(`${url}work/${slug}`)).text();
    const nav = h.slice(h.indexOf('aria-label="More flights"'));
    const [prev, next] = [...nav.matchAll(/href="\/work\/([a-z0-9-]+)"/g)].map((m) => m[1]);
    pages[slug] = { prev, next };
  }
  const n = order.length;
  const bad = order.filter((s, i) => pages[s].next !== order[(i + 1) % n] || pages[s].prev !== order[(i - 1 + n) % n]);
  const unknown = await fetch(`${url}work/not-a-flight`);
  report.wrap = { count: n, order, bad, first: pages[order[0]], last: pages[order[n - 1]], unknownSlugStatus: unknown.status };
}

// ---------- Captures ----------
if (only.includes("captures")) {
  report.captures = {};
  for (const name of Object.keys(SIZES)) {
    const { context, page } = await open(name);
    const shot = (n) => page.screenshot({ path: `${outDir}/${engine}-${n}-${name}.png` });
    await page.goto(url + "#work", { waitUntil: "load" });
    await restored(page);
    await place(page, "#work", 0, 900);
    await shot("gallery-rest");
    if (touch(name)) {
      await strip(page, "#flight-touch-n-go-reporting a").tap();
      await page.waitForTimeout(800);
      await place(page, "#flight-fraud-detection", 80, 300);
      await shot("gallery-stack-expanded");
    } else {
      await page.locator("#flight-touch-n-go-reporting a").hover();
      await page.waitForTimeout(900);
      await shot("gallery-expanded");
      await page.mouse.move(2, 2);
      await page.locator("#flight-inklusif a").focus();
      await page.keyboard.press("Tab");
      await page.waitForTimeout(900);
      await shot("gallery-focus");
    }
    const sx = await page.evaluate(() => document.documentElement.scrollWidth);
    await place(page, "#all-flights-label", 80, 400);
    await shot("all-flights");
    const rows = await page.evaluate(() =>
      [...document.querySelectorAll("#work ol")[1].querySelectorAll("a")].map((a) => Math.round(a.getBoundingClientRect().right)),
    );
    report.captures[name] = { scrollWidth: sx, viewport: SIZES[name].width, manifestRightEdge: Math.max(...rows) };
    for (const slug of ["fraud-detection", "plandora-llm-judge"]) {
      await page.goto(`${url}work/${slug}`, { waitUntil: "load" });
      await page.waitForTimeout(700);
      await shot(`${slug}-top`);
      await place(page, "nav[aria-label='More flights']", 120, 600);
      await shot(`${slug}-foot`);
      report.captures[name][slug] = { scrollWidth: await page.evaluate(() => document.documentElement.scrollWidth) };
    }
    report.captures[name].errors = page.errors;
    await context.close();
  }
}

// ---------- Recordings ----------
if (only.includes("record")) {
  for (const name of ["1440x900", "390x844"]) {
    const vp = SIZES[name];
    const { context, page } = await open(name, { recordVideo: { dir: outDir, size: { width: vp.width, height: vp.height } } });
    await page.goto(url + "#work", { waitUntil: "load" });
    await restored(page);
    await place(page, "#work", 0, 800);
    const slugs = ["fraud-detection", "inklusif", "touch-n-go-reporting", "pengyou", "mapetite", "coral-coders-website"];
    if (touch(name)) {
      for (const s of slugs.slice(1, 4)) {
        await strip(page, `#flight-${s} a`).tap();
        await page.waitForTimeout(900);
      }
      await strip(page, "#flight-pengyou a").tap();
    } else {
      for (const s of slugs) {
        await page.locator(`#flight-${s} a`).hover();
        await page.waitForTimeout(700);
      }
      await page.locator("#flight-mapetite a").hover();
      await page.waitForTimeout(500);
      await page.locator("#flight-mapetite a").click();
    }
    await page.waitForURL("**/work/**");
    await page.waitForTimeout(1500);
    for (let k = 0; k < 2; k++) {
      await place(page, "nav[aria-label='More flights']", 200, 700);
      const link = page.locator("nav[aria-label='More flights'] a").nth(1);
      if (touch(name)) await link.tap();
      else await link.click();
      await page.waitForTimeout(1300);
    }
    await place(page, "nav[aria-label='More flights']", 200, 700);
    const back = page.locator("nav[aria-label='More flights'] a", { hasText: "Back to all flights" });
    if (touch(name)) await back.tap();
    else await back.click();
    await page.waitForURL((u) => u.pathname === "/");
    await page.waitForTimeout(2200);
    const video = page.video();
    await context.close();
    const tag = name.split("x")[0];
    await video.saveAs(`${outDir}/work-${tag}.webm`);
    await video.delete();
  }
}

// ---------- Accessibility ----------
if (only.includes("a11y")) {
  const { context, page } = await open("1440x900");
  await page.goto(url + "#work", { waitUntil: "load" });
  await restored(page);
  const snap = {};
  snap.gallery = await page.locator("#work ol").first().ariaSnapshot();
  snap.manifest = await page.locator("#work ol").nth(1).ariaSnapshot();
  // Keyboard order through the gallery, with the expand following focus.
  await page.locator("#work h2").evaluate((h) => h.closest("section").focus());
  const order = [];
  // WebKit (like Safari by default) moves to links with Option+Tab.
  const tab = engine === "webkit" ? "Alt+Tab" : "Tab";
  for (let k = 0; k < 7; k++) {
    await page.keyboard.press(tab);
    order.push(
      await page.evaluate(() => ({
        name: document.activeElement?.getAttribute("aria-label"),
        expanded: !!document.activeElement?.closest("li")?.hasAttribute("data-active"),
      })),
    );
  }
  snap.keyboard = order;
  await page.goto(`${url}work/touch-n-go-reporting`, { waitUntil: "load" });
  snap.projectPage = await page.locator("main").ariaSnapshot();
  snap.headings = await page.evaluate(() => [...document.querySelectorAll("h1,h2,h3")].map((h) => `${h.tagName} ${h.textContent.trim()}`));
  snap.title = await page.title();
  snap.canonical = await page.evaluate(() => document.querySelector("link[rel=canonical]")?.href);
  snap.description = await page.evaluate(() => document.querySelector("meta[name=description]")?.content);
  await writeFile(`${outDir}/${engine}-a11y.json`, JSON.stringify(snap, null, 2));
  report.a11y = { headings: snap.headings, keyboard: order, title: snap.title, canonical: snap.canonical };
  await context.close();
}

// ---------- Reduced motion ----------
if (only.includes("reduced")) {
  report.reduced = {};
  for (const name of ["1440x900", "390x844"]) {
    const { context, page } = await open(name, { reducedMotion: "reduce" });
    await page.goto(url + "#work", { waitUntil: "load" });
    await page.waitForTimeout(1200);
    await place(page, "#work", 0, 300);
    const sel = "#flight-mapetite";
    if (touch(name)) await strip(page, `${sel} a`).tap();
    else await page.locator(`${sel} a`).hover();
    await page.waitForTimeout(60);
    const size = await page.evaluate((sel) => {
      const r = document.querySelector(sel).getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height) };
    }, sel);
    await page.waitForTimeout(700);
    const settled = await page.evaluate((sel) => {
      const r = document.querySelector(sel).getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height) };
    }, sel);
    await page.evaluate(() => {
      window.__vtSeen = false;
      new MutationObserver(() => (window.__vtSeen = true)).observe(document.documentElement, { attributes: true, attributeFilter: ["data-flight"] });
    });
    if (touch(name)) await strip(page, `${sel} a`).tap();
    else await page.locator(`${sel} a`).click();
    await page.waitForURL("**/work/mapetite");
    await page.waitForTimeout(400);
    report.reduced[name] = { after60ms: size, settled, instant: size.w === settled.w && size.h === settled.h, transition: await page.evaluate(() => window.__vtSeen) };
    await page.screenshot({ path: `${outDir}/${engine}-reduced-project-${name}.png` });
    await context.close();
  }
}

console.log(JSON.stringify(report, null, 2));
await writeFile(`${outDir}/${engine}-report.json`, JSON.stringify(report, null, 2));
await browser.close();
