// Board navigation, scroll restore and corner navigation checks (Phase 3a tweak), in Playwright WebKit.
// Usage: node scripts/qa/board-nav.mjs [url] [outDir] [--only=board,nav,reload,corner,phone]
import { mkdir } from "node:fs/promises";
import { webkit } from "playwright";
import { noCounter } from "./no-counter.mjs";

const url = (process.argv[2] ?? "http://localhost:8787/").replace(/\/?$/, "/");
const outDir = process.argv[3] ?? "docs/qa/phase-3a-tweak";
const only = (process.argv.find((a) => a.startsWith("--only=")) ?? "--only=board,nav,reload,corner,phone").slice(7).split(",");
const SIZES = {
  "360x800": { width: 360, height: 800, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  "390x844": { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  "1440x900": { width: 1440, height: 900, deviceScaleFactor: 2 },
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
  page.on("pageerror", (e) => page.errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && page.errors.push(m.text()));
  // Phase history of the shade, so a reload can be checked for the intro.
  await page.addInitScript(() => {
    window.__phases = [];
    const watch = () => {
      const s = document.querySelector("section[data-phase]");
      if (!s) return requestAnimationFrame(watch);
      window.__phases.push(s.dataset.phase);
      new MutationObserver(() => {
        const p = s.dataset.phase;
        if (window.__phases.at(-1) !== p) window.__phases.push(p);
      }).observe(s, { attributes: true, attributeFilter: ["data-phase"] });
    };
    watch();
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
    return { h, d: (touch ? 2.0 : 2.8) * h, rise: h * 1.22, vh: innerHeight };
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

const state = (page) =>
  page.evaluate(() => {
    const s = document.querySelector("section[data-phase]");
    const sections = ["departures", "journey", "work", "security-check", "stack", "experience", "contact"];
    const near = sections
      .map((id) => ({ id, top: Math.round(document.getElementById(id).getBoundingClientRect().top) }))
      .filter((x) => Math.abs(x.top) <= 2);
    const remarks = Object.fromEntries(
      [...document.querySelectorAll("[data-remark]")]
        .filter((e) => e.matches("[data-flap-row]"))
        .map((e) => [e.dataset.remark, [...e.querySelectorAll("[data-part='bottom'] span")].map((g) => g.dataset.glyph).join("").trimEnd()]),
    );
    const fly = performance.getEntriesByType("resource").filter((r) => r.name.includes("/scene/fly/")).length;
    return {
      y: Math.round(scrollY),
      hash: location.hash,
      atTopOf: near.map((x) => x.id),
      focused: document.activeElement?.id || document.activeElement?.tagName,
      phase: s.dataset.phase,
      phases: window.__phases,
      covered: s.dataset.boardCovered ?? null,
      video: document.querySelector("video").getAttribute("src"),
      flyRequests: fly,
      sign: document.querySelector("header")?.dataset.visible,
      signLabel: [...document.querySelectorAll("[data-sign-tiles] [data-target]")].map((t) => t.dataset.target).join("").trimEnd(),
      remarks,
      saved: sessionStorage.getItem("jbbru:section"),
    };
  });

// ---------- Board captures (settled, hover, focus) and the 360 px fit ----------
if (only.includes("board")) {
  report.board = {};
  for (const name of Object.keys(SIZES)) {
    const { context, page } = await open(name);
    await page.goto(url, { waitUntil: "load" });
    await waitOpen(page);
    await page.waitForTimeout(1200);
    await toBoard(page);
    await settled(page);
    const settleMs = await page.evaluate(() => Number(document.querySelector("[data-settle-ms]").dataset.settleMs));
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${outDir}/board-${name}-settled.png` });
    const layout = await page.evaluate(() => {
      const W = document.documentElement.clientWidth;
      const rects = [...document.querySelectorAll("ol [data-target]")].map((e) => e.getBoundingClientRect());
      const links = [...document.querySelectorAll("ol a")].map((a) => a.getBoundingClientRect());
      return {
        viewportWidth: W,
        hScroll: document.documentElement.scrollWidth > W,
        tilesLeft: Math.round(Math.min(...rects.map((r) => r.left))),
        tilesRight: Math.round(Math.max(...rects.map((r) => r.right))),
        rowTileWidth: +rects[0].width.toFixed(1),
        rowHeight: Math.round(links[0].height),
        names: [...document.querySelectorAll("ol a")].map((a) => a.getAttribute("aria-label")),
      };
    });
    if (!SIZES[name].hasTouch) {
      await page.hover("ol li:nth-child(2) a");
      await page.waitForTimeout(250);
      await page.screenshot({ path: `${outDir}/board-${name}-hover.png` });
      await page.mouse.move(5, 5);
    }
    // WebKit leaves links out of the Tab order by default; a key press, then focus, gives :focus-visible.
    await page.keyboard.press("Shift");
    await page.focus("ol li:nth-child(2) a");
    await page.waitForTimeout(150);
    await page.screenshot({ path: `${outDir}/board-${name}-focus.png` });
    report.board[name] = { boardSettleMs: settleMs, ...layout, errors: page.errors };
    await context.close();
  }
}

// ---------- Navigation: click and Enter, the BOARDING flip, the glide, the hash, DEPARTED ----------
if (only.includes("nav")) {
  report.nav = {};
  for (const name of ["1440x900", "390x844"]) {
    const { context, page } = await open(name);
    await page.goto(url, { waitUntil: "load" });
    await waitOpen(page);
    await page.waitForTimeout(1200);
    await toBoard(page);
    await settled(page);
    const r = {};
    // Click "Selected work": mid-flip capture, then arrival.
    const t0 = Date.now();
    await page.click("ol li:nth-child(2) a");
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${outDir}/nav-${name}-midflip-boarding.png` });
    await page.waitForFunction(() => Math.abs(document.getElementById("work").getBoundingClientRect().top) <= 2, null, { timeout: 6000 });
    r.clickToArrivalMs = Date.now() - t0;
    await page.waitForTimeout(400);
    r.afterClick = await state(page);
    // Back to the board: Selected work now DEPARTED.
    await page.evaluate(() => {
      const top = document.getElementById("departures").getBoundingClientRect().top + scrollY;
      if (window.__lenis) window.__lenis.scrollTo(top, { immediate: true, force: true });
      else window.scrollTo(0, top);
    });
    await page.waitForTimeout(1200);
    r.backOnBoard = await state(page);
    await page.screenshot({ path: `${outDir}/nav-${name}-departed.png` });
    // Keyboard: focus "Contact" and press Enter.
    await page.focus("ol li:nth-child(6) a");
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => Math.abs(document.getElementById("contact").getBoundingClientRect().top) <= 2, null, { timeout: 6000 });
    await page.waitForTimeout(400);
    r.afterEnter = await state(page);
    r.errors = page.errors;
    report.nav[name] = r;
    await context.close();
  }
  // Reduced motion: an instant jump.
  const { context, page } = await open("1440x900", { reducedMotion: "reduce" });
  await page.goto(url, { waitUntil: "load" });
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.getElementById("departures").scrollIntoView());
  await page.waitForTimeout(500);
  await page.click("ol li:nth-child(4) a");
  await page.waitForTimeout(60);
  report.nav.reducedMotion = { after60ms: await state(page), errors: page.errors };
  await context.close();
}

// ---------- Reload: landing, mid-push, mid-cloud, mid-curtain, board, later section, /#work ----------
if (only.includes("reload")) {
  report.reload = {};
  for (const name of ["1440x900", "390x844"]) {
    const r = {};
    const { context, page } = await open(name);
    await page.goto(url, { waitUntil: "load" });
    await waitOpen(page);
    await page.waitForTimeout(800);
    const { d, rise } = await geometry(page);
    const at = async (label, y) => {
      if (y !== null) await scrollTo(page, y, 600);
      const before = await page.evaluate(() => sessionStorage.getItem("jbbru:section"));
      await page.reload({ waitUntil: "load" });
      await page.waitForTimeout(3200);
      r[label] = { savedBeforeReload: before, ...(await state(page)) };
      await page.screenshot({ path: `${outDir}/reload-${name}-${label}.png` });
    };
    await at("landing", 0);
    await at("mid-push", d * 0.3);
    await at("mid-cloud", d * 0.8);
    await at("mid-curtain", d + rise * 0.5);
    await at("board", d + rise + 40);
    await page.evaluate(() => {
      const top = document.getElementById("stack").getBoundingClientRect().top + scrollY;
      if (window.__lenis) window.__lenis.scrollTo(top, { immediate: true, force: true });
      else window.scrollTo(0, top);
    });
    await page.waitForTimeout(600);
    await at("later-section", null);
    await context.close();
    // A fresh visit to /#work.
    const fresh = await open(name);
    await fresh.page.goto(`${url}#work`, { waitUntil: "load" });
    await fresh.page.waitForTimeout(3200);
    r.hashWork = { ...(await state(fresh.page)), errors: fresh.page.errors };
    await fresh.page.screenshot({ path: `${outDir}/reload-${name}-hash-work.png` });
    // Scrolling back up from there into the sequence wakes the video and the frames.
    const g = await geometry(fresh.page);
    await scrollTo(fresh.page, g.d * 0.6, 1500);
    r.hashWorkThenScrollUp = await state(fresh.page);
    // Regression (Phase 3b): back in the push after a restore, the fly-through is still clipped to the
    // window and the camera pushes (the measurement must not come from the hidden, covered stage).
    await scrollTo(fresh.page, g.d * 0.25, 700);
    r.hashWorkThenPush = await fresh.page.evaluate(() => {
      const s = document.querySelector("section[data-phase]");
      return {
        clip: s.querySelector("canvas").style.clipPath.slice(0, 8),
        cameraScale: +new DOMMatrix(getComputedStyle(s.querySelector("[class*='camera']")).transform).a.toFixed(2),
      };
    });
    await fresh.context.close();
    report.reload[name] = r;
  }
}

// ---------- Corner nav: hidden through the sequence, captures, keyboard ----------
if (only.includes("corner")) {
  report.corner = {};
  for (const name of Object.keys(SIZES)) {
    const { context, page } = await open(name);
    await page.goto(url, { waitUntil: "load" });
    await waitOpen(page);
    await page.waitForTimeout(800);
    const { d, rise } = await geometry(page);
    // Hidden at every point of the sequence, including the whole curtain rise.
    const samples = [];
    for (let k = 0; k <= 24; k++) {
      const y = ((d + rise - 2) * k) / 24;
      await scrollTo(page, y, 120);
      samples.push(
        await page.evaluate(() => {
          const h = document.querySelector("header");
          const cs = getComputedStyle(h);
          return { visible: h.dataset.visible, visibility: cs.visibility, opacity: +cs.opacity };
        }),
      );
    }
    const hiddenThroughout = samples.every((s) => s.visible === "false" && s.visibility === "hidden");
    await toBoard(page);
    await page.waitForTimeout(600);
    const onBoard = await state(page);
    await settled(page);
    await page.evaluate(() => document.getElementById("journey").scrollIntoView());
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${outDir}/corner-${name}-closed.png` });
    // Mid-flip: from Gate 1 to Gate 2.
    await page.evaluate(() => document.getElementById("work").scrollIntoView());
    await page.waitForTimeout(110);
    await page.screenshot({ path: `${outDir}/corner-${name}-midflip.png`, clip: { x: 0, y: 0, width: SIZES[name].width, height: 90 } });
    await page.waitForTimeout(600);
    const onWork = await state(page);
    // Keyboard: focus the sign, Enter opens, focus goes to the current entry, Escape closes back to it.
    await page.focus("header nav button");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(350);
    await page.screenshot({ path: `${outDir}/corner-${name}-open.png` });
    const opened = await page.evaluate(() => ({
      expanded: document.querySelector("header nav button").getAttribute("aria-expanded"),
      focused: document.activeElement?.getAttribute("aria-label"),
      current: document.querySelector("header nav a[aria-current]")?.getAttribute("aria-label"),
      items: [...document.querySelectorAll("header nav li")].map((li) => li.textContent),
    }));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(250);
    const escaped = await page.evaluate(() => ({
      expanded: document.querySelector("header nav button").getAttribute("aria-expanded"),
      focusOnButton: document.activeElement === document.querySelector("header nav button"),
    }));
    // Space opens; Tab + Enter chooses the next destination and glides there.
    await page.keyboard.press("Space");
    await page.waitForTimeout(300);
    const spaceOpened = await page.evaluate(() => document.querySelector("header nav button").getAttribute("aria-expanded"));
    await page.focus("header nav li:nth-child(3) a"); // WebKit: links are not in the Tab order by default
    await page.keyboard.press("Enter");
    await page.waitForTimeout(2200);
    const chosen = await page.evaluate((spaceOpened) => ({
      spaceOpened,
      expanded: document.querySelector("header nav button").getAttribute("aria-expanded"),
      focusOnButton: document.activeElement === document.querySelector("header nav button"),
      hash: location.hash,
      atTop: Math.round(document.getElementById("security-check").getBoundingClientRect().top),
    }), spaceOpened);
    // Outside click closes.
    await page.click("header nav button");
    await page.waitForTimeout(300);
    await page.mouse.click(SIZES[name].width / 2, SIZES[name].height - 40);
    await page.waitForTimeout(300);
    const outside = await page.evaluate(() => document.querySelector("header nav button").getAttribute("aria-expanded"));
    const geometryCheck = await page.evaluate(() => {
      const b = document.querySelector("header nav button").getBoundingClientRect();
      return { signTop: Math.round(b.top), signBottom: Math.round(b.bottom), signLeft: Math.round(b.left), signRight: Math.round(b.right), vw: innerWidth };
    });
    report.corner[name] = {
      hiddenThroughout,
      hiddenSamples: samples.length,
      onBoard: { sign: onBoard.sign, label: onBoard.signLabel },
      onWork: { sign: onWork.sign, label: onWork.signLabel },
      opened,
      escaped,
      chosen,
      outsideClickClosed: outside === "false",
      geometry: geometryCheck,
      errors: page.errors,
    };
    await context.close();
  }
}

await browser.close();
console.log(JSON.stringify(report, null, 2));
