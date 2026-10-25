// Without JavaScript (Phase 6): the home page's short version after the departures board, and every project
// page in full. Usage: node scripts/qa/nojs.mjs [url] [outDir] [--engine=chrome|webkit]
import { mkdir } from "node:fs/promises";
import { chromium, webkit } from "playwright";
const url = (process.argv[2] ?? "http://localhost:8787/").replace(/\/?$/, "/");
const outDir = process.argv[3] ?? "docs/qa/phase-6/nojs";
const engine = process.argv.find((a) => a.startsWith("--engine="))?.slice(9) ?? "chrome";
await mkdir(outDir, { recursive: true });
const browser = engine === "webkit" ? await webkit.launch() : await chromium.launch({ channel: "chrome" });
const report = { engine, home: {}, projects: [] };
for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  const ctx = await browser.newContext({ viewport: vp, javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "load" });
  const brief = page.locator("section[aria-labelledby='no-script-line']");
  await brief.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${outDir}/${engine}-home-${vp.width}.png`, fullPage: false });
  report.home[vp.width] = await page.evaluate(() => {
    const s = document.querySelector("section[aria-labelledby='no-script-line']");
    const r = s?.getBoundingClientRect();
    const board = document.getElementById("departures").getBoundingClientRect();
    return {
      shown: !!s && r.height > 0 && getComputedStyle(s).display !== "none",
      afterBoard: !!s && r.top + scrollY >= board.bottom + scrollY - 1,
      line: s?.querySelector("#no-script-line")?.textContent,
      projectLinks: [...(s?.querySelectorAll("a[href^='/work/']") ?? [])].map((a) => a.getAttribute("href")),
      contact: [...(s?.querySelectorAll("ul")[1]?.querySelectorAll("li") ?? [])].map((li) => li.textContent.trim()),
      resumeLink: !!s?.querySelector("a[href$='.pdf']"),
      mailto: !!document.querySelector("a[href^='mailto:']"),
      fullAddress: document.documentElement.outerHTML.includes("jb.brubusiness3@gmail.com"),
      sideways: document.documentElement.scrollWidth > innerWidth,
    };
  });
  await ctx.close();
}
// Every project page: no hidden streamed chunks, the case study, links, images and stack all visible.
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false });
const page = await ctx.newPage();
for (const href of report.home[1440].projectLinks) {
  const res = await page.goto(new URL(href, url).href, { waitUntil: "load" });
  const r = await page.evaluate(() => {
    const visible = (el) => { const b = el.getBoundingClientRect(); const s = getComputedStyle(el); return b.width > 0 && b.height > 0 && s.visibility !== "hidden" && +s.opacity > 0; };
    const main = document.querySelector("main") ?? document.body;
    const hiddenChunks = [...document.querySelectorAll("div[hidden][id^='S:']")].length;
    const imgs = [...main.querySelectorAll("img")];
    return {
      h1: document.querySelector("h1")?.textContent,
      hiddenChunks,
      headings: [...main.querySelectorAll("h2")].filter(visible).map((h) => h.textContent.trim()),
      paragraphs: [...main.querySelectorAll("p")].filter(visible).length,
      invisibleText: [...main.querySelectorAll("p, li, h2, h3, dd")].filter((e) => e.textContent.trim() && !visible(e)).length,
      images: imgs.length,
      imagesInvisible: imgs.filter((i) => !visible(i)).length,
      links: [...main.querySelectorAll("a[href]")].filter(visible).length,
      prevNext: [...document.querySelectorAll("a[href^='/work/']")].length,
    };
  });
  report.projects.push({ href, status: res.status(), ...r });
  if (href.endsWith("fraud-detection") || href.endsWith("touch-n-go-reporting")) await page.screenshot({ path: `${outDir}/${engine}-${href.split("/").pop()}.png`, fullPage: true });
}
await ctx.close();
console.log(JSON.stringify(report, null, 2));
await browser.close();
