// Accessibility (Phase 7a), in the installed Chrome:
//   axe       axe-core (WCAG 2.0 to 2.2 A and AA, and best practice) on the home page, two project pages and the
//             404, after a full scroll so every entrance has run; colour contrast is axe's own rule
//   outline   headings (one <h1>, the <h2> and <h3> order) and landmarks on the home page
//   tree      the accessibility tree of the board, the passport, the scanner and the start of the seat map
//   keyboard  Tab from the top of the home page to the footer: every stop, whether its focus is visible, whether
//             it is on screen, and any trap; then Shift+Tab, Escape on the corner sign and Enter on a board row
//   reduced   a full pass under prefers-reduced-motion against DESIGN.md's rules
// Usage: node scripts/qa/a11y.mjs [url] [outDir] [--only=axe,outline,tree,keyboard,reduced]
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";

const url = (process.argv[2] ?? "http://localhost:8787/").replace(/\/?$/, "/");
const outDir = process.argv[3] ?? "docs/qa/phase-7a/a11y";
const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7).split(",") ?? ["axe", "outline", "tree", "keyboard", "reduced"];
await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
const report = {};

async function open(extra = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...extra });
  const page = await context.newPage();
  page.errors = [];
  page.on("pageerror", (e) => page.errors.push(String(e)));
  return { context, page };
}
async function scrollThrough(page) {
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 500) {
    await page.evaluate((y) => (window.__lenis ? window.__lenis.scrollTo(y, { immediate: true, force: true }) : window.scrollTo(0, y)), y);
    await page.waitForTimeout(200);
  }
  await page.waitForTimeout(2500);
}

// ---------- axe ----------
if (only.includes("axe")) {
  report.axe = {};
  for (const path of ["", "work/fraud-detection", "work/touch-n-go-reporting", "no-such-page"]) {
    const { context, page } = await open();
    await page.goto(url + path, { waitUntil: "load" });
    await page.waitForTimeout(2500);
    await scrollThrough(page);
    const res = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"]).analyze();
    report.axe["/" + path] = {
      violations: res.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, count: v.nodes.length, targets: v.nodes.slice(0, 6).map((n) => ({ target: n.target.join(" "), summary: n.failureSummary?.split("\n").slice(0, 3).join(" ").slice(0, 300) })) })),
      incomplete: res.incomplete.map((v) => ({ id: v.id, count: v.nodes.length, targets: v.nodes.slice(0, 4).map((n) => n.target.join(" ")) })),
      passes: res.passes.length,
    };
    await context.close();
  }
}

// ---------- Headings and landmarks ----------
if (only.includes("outline")) {
  const { context, page } = await open();
  await page.goto(url, { waitUntil: "load" });
  await page.waitForTimeout(2500);
  await scrollThrough(page);
  report.outline = await page.evaluate(() => {
    const shown = (el) => !el.closest("[hidden], [aria-hidden='true']") && getComputedStyle(el).display !== "none";
    return {
      headings: [...document.querySelectorAll("h1, h2, h3, h4, h5, h6")].filter(shown).map((h) => `${h.tagName} ${h.textContent.trim().replace(/\s+/g, " ").slice(0, 60)}`),
      landmarks: [...document.querySelectorAll("header, nav, main, footer, aside, section[aria-label], section[aria-labelledby], [role=region], [role=navigation], [role=banner], [role=contentinfo], [role=main]")]
        .filter(shown)
        .map((el) => `${el.tagName.toLowerCase()}${el.getAttribute("role") ? `[role=${el.getAttribute("role")}]` : ""} ${el.getAttribute("aria-label") ?? (el.getAttribute("aria-labelledby") ? document.getElementById(el.getAttribute("aria-labelledby"))?.textContent.trim().slice(0, 40) : "")}`),
      lang: document.documentElement.lang,
      title: document.title,
    };
  });
  await context.close();
}

// ---------- The accessibility tree of the complex parts ----------
if (only.includes("tree")) {
  const { context, page } = await open();
  await page.goto(url, { waitUntil: "load" });
  await page.waitForTimeout(2500);
  await scrollThrough(page);
  report.tree = {};
  for (const [name, sel] of [["board", "#departures"], ["passport", "#journey"], ["scanner", "#security-check"], ["seatMap", "#stack"]]) {
    const snap = await page.locator(sel).ariaSnapshot();
    report.tree[name] = snap.split("\n").slice(0, name === "seatMap" ? 60 : 90).join("\n");
  }
  await context.close();
}

// ---------- Keyboard only ----------
if (only.includes("keyboard")) {
  const { context, page } = await open();
  await page.goto(url, { waitUntil: "load" });
  await page.waitForFunction(() => document.querySelector("section[data-phase]")?.dataset.phase === "open", null, { timeout: 30000 });
  await page.waitForTimeout(3000);
  const stops = [];
  let same = 0, last = null, reachedFooter = false;
  for (let i = 0; i < 500; i++) {
    await page.keyboard.press("Tab");
    await page.waitForTimeout(i < 40 ? 260 : 140);
    const s = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const ring = (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0) || (cs.boxShadow && cs.boxShadow !== "none");
      // Some focus styles live on a child or a pseudo-element (::after / ::before rings).
      const pseudo = ["::after", "::before"].some((p) => { const ps = getComputedStyle(el, p); return ps.content !== "none" && ((ps.outlineStyle !== "none" && parseFloat(ps.outlineWidth) > 0) || (ps.boxShadow && ps.boxShadow !== "none") || (ps.borderStyle !== "none" && parseFloat(ps.borderWidth) > 0)); });
      const name = el.getAttribute("aria-label") ?? el.textContent.trim().replace(/\s+/g, " ").slice(0, 50);
      const sec = el.closest("section[id], footer, header")?.id || el.closest("footer, header")?.tagName.toLowerCase() || "";
      return { key: `${el.tagName}#${el.id}|${name}|${Math.round(r.top + scrollY)}`, tag: el.tagName.toLowerCase(), id: el.id, name, section: sec, onScreen: r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth, ring: ring || pseudo, inFooter: !!el.closest("footer") };
    });
    if (!s) { stops.push({ body: true }); if (reachedFooter) break; continue; }
    if (s.key === last) same++; else same = 0;
    last = s.key;
    stops.push(s);
    if (same >= 3) break;
    if (s.inFooter) reachedFooter = true;
    else if (reachedFooter) break; // wrapped round after the footer
  }
  const real = stops.filter((s) => !s.body);
  report.keyboard = {
    stops: real.length,
    reachedFooter,
    trap: same >= 3 ? last : null,
    notOnScreen: real.filter((s) => !s.onScreen).map((s) => `${s.section}: ${s.tag} ${s.name}`),
    noVisibleRing: real.filter((s) => !s.ring).map((s) => `${s.section}: ${s.tag}${s.id ? "#" + s.id : ""} ${s.name}`),
    bySection: real.reduce((a, s) => ((a[s.section || "(none)"] = (a[s.section || "(none)"] ?? 0) + 1), a), {}),
    order: real.map((s) => `${s.section}: ${s.tag}${s.id ? "#" + s.id : ""} ${s.name}`),
  };
  // Shift+Tab goes back one stop.
  await page.keyboard.press("Shift+Tab");
  await page.waitForTimeout(300);
  report.keyboard.shiftTabFromEnd = await page.evaluate(() => document.activeElement?.getAttribute("aria-label") ?? document.activeElement?.textContent.trim().slice(0, 40));
  // The corner sign: open with Enter, close with Escape, focus back on the button.
  await page.evaluate(() => document.getElementById("work").scrollIntoView());
  await page.waitForTimeout(1500);
  await page.locator("header nav button").first().focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(700);
  const opened = await page.evaluate(() => document.querySelector("header nav button")?.getAttribute("aria-expanded"));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
  report.keyboard.cornerSign = { opened, closedFocusOnButton: await page.evaluate(() => document.activeElement === document.querySelector("header nav button")), expandedAfter: await page.evaluate(() => document.querySelector("header nav button")?.getAttribute("aria-expanded")) };
  // A board row with Enter: glides there and moves focus to the section.
  await page.evaluate(() => document.getElementById("departures").scrollIntoView());
  await page.waitForTimeout(1200);
  await page.locator("#departures a[href='#experience']").focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(2500);
  report.keyboard.boardRowEnter = await page.evaluate(() => ({ top: Math.round(document.getElementById("experience").getBoundingClientRect().top), focused: document.activeElement?.id }));
  report.keyboard.errors = page.errors;
  await context.close();
}

// ---------- Reduced motion ----------
if (only.includes("reduced")) {
  const { context, page } = await open({ reducedMotion: "reduce" });
  await page.goto(url, { waitUntil: "load" });
  await page.waitForTimeout(3000);
  const r = {};
  r.landing = await page.evaluate(() => {
    const s = document.querySelector("section[data-phase]");
    return { phase: s.dataset.phase, pinned: s.parentElement.classList.contains("pin-spacer"), greeting: document.querySelector("section[data-phase] [class*='deck']")?.textContent.trim().slice(0, 60) };
  });
  await page.waitForTimeout(4500);
  r.landing.greetingAfter4s = await page.evaluate(() => document.querySelector("section[data-phase] [class*='deck']")?.textContent.trim().slice(0, 60));
  // Through the page: record every running animation and every transition that is not opacity-only.
  const seen = { animations: new Set(), transitions: new Set() };
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 450) {
    await page.evaluate((y) => window.scrollTo(0, y), y);
    await page.waitForTimeout(350);
    const found = await page.evaluate(() => {
      const label = (el) => `${el.tagName.toLowerCase()}.${(typeof el.className === "string" ? el.className : "").split(" ")[0].replace(/^[\w-]+?_/, "")}`;
      const anims = document.getAnimations().filter((a) => a.playState === "running").map((a) => {
        const kf = a.effect?.getKeyframes?.() ?? [];
        const props = [...new Set(kf.flatMap((k) => Object.keys(k).filter((p) => !["offset", "easing", "composite", "computedOffset"].includes(p))))];
        const t = a.effect?.getComputedTiming?.();
        return `${a.constructor.name} ${a.animationName ?? a.transitionProperty ?? ""} on ${a.effect?.target ? label(a.effect.target) : "?"} [${props.join(",")}] ${Math.round(t?.duration ?? 0)}ms`;
      });
      const moving = [...document.querySelectorAll("body *")].filter((el) => {
        const cs = getComputedStyle(el);
        if (!cs.transitionDuration || cs.transitionDuration.split(",").every((d) => parseFloat(d) === 0)) return false;
        return cs.transitionProperty.split(",").some((p, i) => !["opacity", "none", "color", "background-color", "border-color", "outline-color", "fill", "stroke", "text-decoration-color"].includes(p.trim()) && parseFloat(cs.transitionDuration.split(",")[i] ?? cs.transitionDuration.split(",")[0]) > 0);
      }).map((el) => `${label(el)} ${getComputedStyle(el).transitionProperty}`);
      return { anims, moving };
    });
    found.anims.forEach((a) => seen.animations.add(a));
    found.moving.forEach((m) => seen.transitions.add(m));
  }
  r.runningAnimations = [...seen.animations].slice(0, 40);
  r.nonOpacityTransitions = [...seen.transitions].slice(0, 40);
  r.state = await page.evaluate(() => ({
    stampsLanded: [...document.querySelectorAll("#journey [data-entry]")].map((e) => e.hasAttribute("data-landed")),
    seatsEntered: document.querySelector("#stack [data-entered]")?.dataset.entered ?? null,
    logbook: document.querySelector("#experience [data-reveal-group]")?.dataset.revealGroup,
    dutyFree: document.querySelector("#contact [data-reveal-group]")?.dataset.revealGroup,
    boardSettled: [...document.querySelectorAll("#departures [data-target]")].slice(0, 40).every((t) => t.querySelector("[data-part='bottom'] span").dataset.glyph === t.dataset.target),
  }));
  // Photo stacks never advance on their own.
  await page.evaluate(() => document.getElementById("experience").scrollIntoView());
  const stack = page.locator("#experience [aria-roledescription='photo stack']").first();
  await stack.scrollIntoViewIfNeeded();
  const c0 = await stack.locator("[aria-live] [aria-hidden]").textContent();
  await page.waitForTimeout(9000);
  r.photoStack = { before: c0, after9s: await stack.locator("[aria-live] [aria-hidden]").textContent() };
  // The scanner: the verdict appears with nothing moving.
  await page.evaluate(() => document.getElementById("security-check").scrollIntoView());
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: /^Weekly shop, \$/ }).click();
  await page.waitForTimeout(400);
  r.scanner = await page.evaluate(() => ({
    verdictWithin400ms: document.querySelector('#security-check section[aria-label="Screening report"] [data-verdict]')?.dataset.verdict ?? null,
    running: document.getAnimations().filter((a) => a.playState === "running" && a.effect?.target?.closest?.("#security-check")).length,
  }));
  r.errors = page.errors;
  report.reduced = r;
  await context.close();
}

await writeFile(`${outDir}/a11y-report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();
