// Screen sizes and zoom (Phase 7a). At each size: a fresh load, the landing, then every section and the footer,
// with a screenshot of each and these checks: sideways scroll, text cut off at the screen edge, text smaller
// than 12 px, and visible text boxes that overlap. 200% zoom at 1440x900 is the same layout as 720x450 at
// twice the pixel density, so "zoom200" renders that and tries the main controls.
// Usage: node scripts/qa/sizes.mjs [url] [outDir] [--engine=chrome|webkit|firefox] [--sizes=a,b]
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, firefox, webkit } from "playwright";

const url = (process.argv[2] ?? "http://localhost:8787/").replace(/\/?$/, "/");
const outDir = process.argv[3] ?? "docs/qa/phase-7a/sizes";
const engine = process.argv.find((a) => a.startsWith("--engine="))?.slice(9) ?? "chrome";
const only = process.argv.find((a) => a.startsWith("--sizes="))?.slice(8).split(",");
await mkdir(outDir, { recursive: true });
const browser = engine === "webkit" ? await webkit.launch() : engine === "firefox" ? await firefox.launch() : await chromium.launch({ channel: "chrome" });
const ALL = {
  "360x800": { width: 360, height: 800, touch: true },
  "390x844": { width: 390, height: 844, touch: true },
  "430x932": { width: 430, height: 932, touch: true },
  "844x390": { width: 844, height: 390, touch: true },
  "768x1024": { width: 768, height: 1024, touch: true },
  "1024x768": { width: 1024, height: 768 },
  "1280x800": { width: 1280, height: 800 },
  "1440x900": { width: 1440, height: 900 },
  "1920x1080": { width: 1920, height: 1080 },
  "2560x1440": { width: 2560, height: 1440 },
  zoom200: { width: 720, height: 450, scale: 2 },
};
const SIZES = Object.fromEntries(Object.entries(ALL).filter(([k]) => !only || only.includes(k)));
const STOPS = ["departures", "journey", "work", "security-check", "stack", "experience", "contact", "footer"];
const report = { engine, sizes: {} };

/** Layout checks for what is on screen now. */
const inspect = (page) =>
  page.evaluate(() => {
    const W = document.documentElement.clientWidth;
    const H = innerHeight;
    const visible = (el) => {
      const s = getComputedStyle(el);
      if (s.visibility === "hidden" || s.display === "none" || +s.opacity === 0) return false;
      for (let p = el; p; p = p.parentElement) if (+getComputedStyle(p).opacity === 0) return false;
      return true;
    };
    // Leaf text: elements with their own non-blank text.
    const leaves = [...document.querySelectorAll("body *")].filter((el) => {
      if (el.closest("svg, script, style, noscript, [aria-hidden='true'], .sr-only, [hidden]")) return false;
      if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < H && visible(el);
    });
    const label = (el) => `${el.tagName.toLowerCase()}${el.className && typeof el.className === "string" ? "." + el.className.split(" ")[0].replace(/^[\w-]+?_/, "") : ""} "${el.textContent.trim().slice(0, 40)}"`;
    const cut = leaves.filter((el) => { const r = el.getBoundingClientRect(); return r.left < -1 || r.right > W + 1; }).map(label);
    const small = [...new Set(leaves.filter((el) => parseFloat(getComputedStyle(el).fontSize) < 12).map((el) => `${Math.round(parseFloat(getComputedStyle(el).fontSize) * 10) / 10}px ${label(el)}`))];
    // Overlaps between text boxes that are not nested (ignoring sub-pixel touches).
    const boxes = leaves.map((el) => ({ el, r: el.getBoundingClientRect() }));
    const overlaps = [];
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j];
        if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
        const x = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
        const y = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
        if (x > 3 && y > 3) overlaps.push(`${label(a.el)} × ${label(b.el)}`);
      }
    return { sideways: document.documentElement.scrollWidth > W, cut: [...new Set(cut)].slice(0, 8), small: small.slice(0, 12), overlaps: [...new Set(overlaps)].slice(0, 8) };
  });

async function goTo(page, id) {
  await page.evaluate((id) => {
    const el = id === "footer" ? document.querySelector("footer") : document.getElementById(id);
    const y = el.getBoundingClientRect().top + scrollY;
    if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true, force: true });
    else window.scrollTo(0, y);
  }, id);
  await page.waitForTimeout(1600);
}

for (const [name, s] of Object.entries(SIZES)) {
  const context = await browser.newContext({
    viewport: { width: s.width, height: s.height },
    deviceScaleFactor: s.scale ?? 1,
    hasTouch: !!s.touch,
    isMobile: engine === "chrome" && !!s.touch,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && !/40[39]|429/.test(m.text()) && errors.push(m.text()));
  await page.goto(url, { waitUntil: "load" });
  await page.waitForFunction(() => document.querySelector("section[data-phase]")?.dataset.phase === "open", null, { timeout: 30000 });
  await page.waitForTimeout(2500);
  const r = { landing: await inspect(page) };
  await page.screenshot({ path: `${outDir}/${engine}-${name}-0-landing.png` });
  // Through the sections: first the whole page once (so every entrance has run), then each stop.
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += Math.round(s.height * 0.8)) {
    await page.evaluate((y) => (window.__lenis ? window.__lenis.scrollTo(y, { immediate: true, force: true }) : window.scrollTo(0, y)), y);
    await page.waitForTimeout(250);
  }
  for (const [i, id] of STOPS.entries()) {
    await goTo(page, id);
    r[id] = await inspect(page);
    await page.screenshot({ path: `${outDir}/${engine}-${name}-${i + 1}-${id}.png` });
  }
  if (name === "zoom200") {
    // The main controls still work at 200%.
    const f = {};
    await goTo(page, "departures");
    await page.locator("#departures a[href='#stack']").click();
    await page.waitForTimeout(2500);
    f.boardRowToStack = await page.evaluate(() => Math.round(document.getElementById("stack").getBoundingClientRect().top));
    await page.locator("#seat-python").scrollIntoViewIfNeeded();
    await page.locator("#seat-python").click();
    await page.waitForTimeout(800);
    f.seatSelected = await page.evaluate(() => document.getElementById("seat-python").getAttribute("aria-pressed"));
    await page.screenshot({ path: `${outDir}/${engine}-zoom200-seat-card.png` });
    await page.keyboard.press("Escape");
    await page.locator("header nav button").first().click();
    await page.waitForTimeout(800);
    f.cornerSignOpen = await page.evaluate(() => document.querySelector("header nav button")?.getAttribute("aria-expanded"));
    await page.screenshot({ path: `${outDir}/${engine}-zoom200-corner-sign.png` });
    await page.keyboard.press("Escape");
    await goTo(page, "security-check");
    await page.getByRole("button", { name: "Passenger: Weekly shop", exact: true }).click();
    await page.waitForFunction(() => document.querySelector('#security-check section[aria-label="Screening report"] [data-verdict]'), null, { timeout: 20000 }).catch(() => undefined);
    await page.waitForTimeout(1200);
    f.scannerVerdict = await page.evaluate(() => document.querySelector('#security-check section[aria-label="Screening report"] [data-verdict]')?.dataset.verdict ?? null);
    await page.screenshot({ path: `${outDir}/${engine}-zoom200-scanner.png` });
    r.functions = f;
  }
  r.errors = errors;
  report.sizes[name] = r;
  await context.close();
}
await writeFile(`${outDir}/${engine}-sizes-report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();
