// Links, media and privacy (Phase 7a), in the installed Chrome (or --engine=webkit|firefox).
//   links    every internal href on the home page, the 18 project pages and the 404 answers 200, and every
//            #fragment exists on its target page
//   images   every <img> loads, none lacks an alt attribute; all alt texts listed for review
//   video    each YouTube facade swaps in the youtube-nocookie.com player on click
//   privacy  after a full visit (scroll, sound on, a scan, a seat, a project and back, Copy email): cookies,
//            localStorage and sessionStorage keys, and every request to another origin
// Usage: node scripts/qa/media.mjs [url] [outDir] [--engine=chrome|webkit|firefox]
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, firefox, webkit } from "playwright";
import { noCounter } from "./no-counter.mjs";

const url = (process.argv[2] ?? "http://localhost:8787/").replace(/\/?$/, "/");
const outDir = process.argv[3] ?? "docs/qa/phase-7a/media";
const engine = process.argv.find((a) => a.startsWith("--engine="))?.slice(9) ?? "chrome";
await mkdir(outDir, { recursive: true });
const browser = engine === "webkit" ? await webkit.launch() : engine === "firefox" ? await firefox.launch() : await chromium.launch({ channel: "chrome" });
noCounter(browser);
const origin = new URL(url).origin;
const report = { engine };

const home = await (await fetch(url)).text();
const slugs = [...new Set([...home.matchAll(/href="\/work\/([a-z0-9-]+)"/g)].map((m) => m[1]))];
const pages = ["/", "/no-such-page", ...slugs.map((s) => `/work/${s}`)];

// ---------- Internal links and fragments ----------
{
  const html = {};
  for (const p of pages) html[p] = await (await fetch(origin + p)).text();
  const hrefs = new Map();
  for (const p of pages)
    for (const m of html[p].matchAll(/href="(\/[^"]*|#[^"]+)"/g)) {
      const h = m[1].startsWith("#") ? p.split("#")[0] + m[1] : m[1];
      if (h.startsWith("/_next/")) continue;
      if (!hrefs.has(h)) hrefs.set(h, new Set());
      hrefs.get(h).add(p);
    }
  const bad = [];
  const ids = {};
  for (const [h, from] of hrefs) {
    const [path, frag] = h.split("#");
    const target = path || "/";
    if (!(target in html)) {
      const r = await fetch(origin + target);
      if (r.status !== 200) { bad.push({ href: h, status: r.status, from: [...from].slice(0, 3) }); continue; }
      html[target] = await r.text();
    }
    if (frag) {
      ids[target] ??= new Set([...html[target].matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
      if (!ids[target].has(decodeURIComponent(frag))) bad.push({ href: h, missingFragment: frag, from: [...from].slice(0, 3) });
    }
  }
  report.links = { pages: pages.length, internalHrefs: hrefs.size, bad };
}

// ---------- Images and the video facades ----------
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  report.images = { broken: [], missingAlt: [], alts: {} };
  report.video = [];
  for (const p of pages) {
    await page.goto(origin + p, { waitUntil: "load" });
    await page.waitForTimeout(p === "/" ? 3000 : 1200);
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < h; y += 600) {
      await page.evaluate((y) => (window.__lenis ? window.__lenis.scrollTo(y, { immediate: true, force: true }) : window.scrollTo(0, y)), y);
      await page.waitForTimeout(180);
    }
    await page.waitForTimeout(1500);
    const imgs = await page.evaluate(() =>
      [...document.querySelectorAll("img")].map((i) => ({
        src: (i.currentSrc || i.src).replace(location.origin, ""),
        alt: i.getAttribute("alt"),
        decorative: i.getAttribute("alt") === "" || !!i.closest("[aria-hidden='true']") || i.getAttribute("role") === "presentation",
        ok: i.complete && i.naturalWidth > 0,
        lazyUnloaded: i.loading === "lazy" && !i.complete,
      })),
    );
    for (const i of imgs) {
      if (!i.ok && !i.lazyUnloaded) report.images.broken.push({ page: p, src: i.src });
      if (i.alt === null) report.images.missingAlt.push({ page: p, src: i.src });
      if (i.alt) (report.images.alts[p] ??= []).push(i.alt);
    }
    // The facade: click it, and the no-cookie player must appear.
    const facade = page.locator("button[aria-label^='Play'], [data-facade] button").first();
    if (await facade.count()) {
      await facade.scrollIntoViewIfNeeded();
      await facade.click();
      await page.waitForTimeout(2500);
      const frame = await page.evaluate(() => { const f = document.querySelector("iframe"); return f ? { src: f.src.split("?")[0], allow: f.getAttribute("allow") } : null; });
      const loaded = page.frames().some((f) => f.url().includes("youtube-nocookie.com/embed"));
      report.video.push({ page: p, iframe: frame, playerFrameLoaded: loaded });
    }
  }
  report.images.count = Object.values(report.images.alts).flat().length;
  await context.close();
}

// ---------- Privacy ----------
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: engine === "chrome" ? ["clipboard-read", "clipboard-write"] : [] });
  const page = await context.newPage();
  const foreign = new Set();
  page.on("request", (r) => { const o = new URL(r.url()).origin; if (o !== origin && !r.url().startsWith("data:") && !r.url().startsWith("blob:")) foreign.add(o); });
  await page.goto(url, { waitUntil: "load" });
  await page.waitForFunction(() => document.querySelector("section[data-phase]")?.dataset.phase === "open", null, { timeout: 30000 });
  await page.waitForTimeout(2000);
  // Sound on (the board toggle), a full scroll, a seat, a scan, Copy email, a project and back.
  await page.evaluate(() => document.getElementById("departures").scrollIntoView());
  await page.waitForTimeout(1500);
  await page.locator("#departures button[aria-label='Sound']").first().click().catch(() => undefined);
  await page.waitForTimeout(800);
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 500) { await page.evaluate((y) => window.scrollTo(0, y), y); await page.waitForTimeout(150); }
  await page.locator("#seat-python").click().catch(() => undefined);
  await page.waitForTimeout(500);
  await page.evaluate(() => document.getElementById("security-check").scrollIntoView());
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: /^Weekly shop, \$/ }).click().catch(() => undefined);
  await page.waitForTimeout(4000);
  await page.locator("#contact button[aria-label='Copy the email address']").click().catch(() => undefined);
  await page.waitForTimeout(500);
  await page.goto(origin + "/work/fraud-detection", { waitUntil: "load" });
  await page.waitForTimeout(1500);
  await page.goBack({ waitUntil: "load" });
  await page.waitForTimeout(2000);
  report.privacy = {
    cookies: (await context.cookies()).map((c) => `${c.domain} ${c.name}`),
    localStorage: await page.evaluate(() => Object.keys(localStorage).sort().map((k) => `${k} = ${localStorage.getItem(k).slice(0, 40)}`)),
    sessionStorage: await page.evaluate(() => Object.keys(sessionStorage).sort().map((k) => `${k} = ${sessionStorage.getItem(k).slice(0, 40)}`)),
    documentCookie: await page.evaluate(() => document.cookie),
    thirdPartyOrigins: [...foreign],
  };
  await context.close();
}

await writeFile(`${outDir}/${engine}-media-report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();
