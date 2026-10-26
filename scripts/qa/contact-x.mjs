// Duty free with six products (the resume and X), the logbook's resume link and the no-JavaScript short version,
// at 360x800, 390x844 and 1440x900. Usage: node scripts/qa/contact-x.mjs [url] [outDir] [--engine=chrome|webkit]
import { mkdir } from "node:fs/promises";
import { chromium, firefox, webkit } from "playwright";
import { noCounter } from "./no-counter.mjs";
const url = (process.argv[2] ?? "http://localhost:8787/").replace(/\/?$/, "/");
const outDir = process.argv[3] ?? "docs/qa/phase-6/contact-x";
const engine = process.argv.find((a) => a.startsWith("--engine="))?.slice(9) ?? "chrome";
await mkdir(outDir, { recursive: true });
const browser = engine === "firefox" ? await firefox.launch() : engine === "webkit" ? await webkit.launch() : await chromium.launch({ channel: "chrome" });

// Firefox (Phase 7a fixes): no isMobile, and no clipboard permissions (Firefox supports neither).
if (engine === "firefox") {
  const nc = browser.newContext.bind(browser);
  browser.newContext = (o = {}) => nc({ ...o, isMobile: undefined, permissions: (o.permissions ?? []).filter((x) => !x.startsWith("clipboard")) });
}
noCounter(browser);
const SIZES = { "360x800": { width: 360, height: 800, touch: true }, "390x844": { width: 390, height: 844, touch: true }, "1440x900": { width: 1440, height: 900 } };
const report = { engine, sizes: {} };
const pdf = async (href) => { const r = await fetch(new URL(href, url)); return { status: r.status, type: r.headers.get("content-type"), bytes: (await r.arrayBuffer()).byteLength }; };

for (const [name, s] of Object.entries(SIZES)) {
  const out = {};
  // With JavaScript: Duty free and the logbook link.
  {
    const ctx = await browser.newContext({ viewport: { width: s.width, height: s.height }, hasTouch: !!s.touch, isMobile: engine === "chrome" && !!s.touch });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => m.type() === "error" && !/40[39]|429/.test(m.text()) && errors.push(m.text()));
    await page.goto(url + "#contact", { waitUntil: "load" });
    await page.waitForFunction(() => document.querySelector("#contact [data-reveal-group]")?.dataset.revealGroup === "done" || document.querySelectorAll("#contact [data-revealed]").length >= 6, null, { timeout: 15000 }).catch(() => undefined);
    await page.waitForTimeout(1500);
    out.dutyFree = await page.evaluate(() => {
      const bays = [...document.querySelectorAll("#contact ul > li")];
      const rows = {};
      for (const b of bays) { const t = Math.round(b.getBoundingClientRect().top + scrollY); rows[t] = (rows[t] ?? 0) + 1; }
      const targets = [...document.querySelectorAll("#contact a, #contact button")].filter((e) => getComputedStyle(e).display !== "none").map((e) => { const r = e.getBoundingClientRect(); return { name: e.getAttribute("aria-label") ?? e.textContent.trim(), w: Math.round(r.width), h: Math.round(r.height) }; });
      return {
        products: bays.map((b) => b.querySelector("[aria-label]")?.getAttribute("aria-label") ?? b.textContent.trim().slice(0, 30)),
        perShelf: Object.values(rows),
        tags: bays.map((b) => b.querySelector("[class*='tagName']")?.textContent),
        x: (() => { const a = document.querySelector("#contact a[href='https://x.com/jb_bru3']"); return a && { target: a.target, rel: a.rel, label: a.getAttribute("aria-label"), action: a.querySelector("[class*='tagAction']")?.textContent, markPath: a.querySelector("svg svg path")?.getAttribute("d")?.slice(0, 24), visible: getComputedStyle(a).opacity }; })(),
        resumeHref: document.querySelector("#contact a[href$='.pdf']")?.getAttribute("href") ?? null,
        smallTargets: targets.filter((t) => t.h < 44 || t.w < 44),
        sideways: document.documentElement.scrollWidth > innerWidth,
        hiddenProducts: bays.filter((b) => +getComputedStyle(b).opacity < 1).length,
      };
    });
    await page.locator("#contact ul").scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${outDir}/${engine}-dutyfree-${name}.png`, fullPage: false });
    if (out.dutyFree.resumeHref) out.dutyFree.resumePdf = await pdf(out.dutyFree.resumeHref);
    // The logbook's resume link.
    await page.goto(url + "#experience", { waitUntil: "load" });
    await page.waitForTimeout(1500);
    out.logbookLink = await page.evaluate(() => { const a = [...document.querySelectorAll("#experience a")].find((x) => /RESUME/.test(x.textContent)); if (!a) return null; const r = a.getBoundingClientRect(); const after = getComputedStyle(a, "::after"); const tap = r.height - parseFloat(after.top) - parseFloat(after.bottom); return { text: a.textContent.trim(), href: a.getAttribute("href"), target: a.target, label: a.getAttribute("aria-label"), h: Math.round(r.height), tapHeight: Math.round(after.content === "none" ? r.height : tap) }; });
    if (out.logbookLink) {
      out.logbookLink.pdf = await pdf(out.logbookLink.href);
      await page.locator("#experience a[href$='.pdf']").scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${outDir}/${engine}-logbook-${name}.png` });
      // Clicking it opens the PDF (a new tab).
      const [popup] = await Promise.all([page.waitForEvent("popup", { timeout: 8000 }).catch(() => null), page.locator("#experience a[href$='.pdf']").click()]);
      if (popup) await popup.waitForLoadState("domcontentloaded").catch(() => undefined);
      out.logbookLink.opened = popup ? popup.url() : null;
      if (popup) await popup.close();
    }
    out.errors = errors;
    await ctx.close();
  }
  // Without JavaScript: the short version.
  {
    const ctx = await browser.newContext({ viewport: { width: s.width, height: s.height }, javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: "load" });
    await page.locator("section[aria-labelledby='no-script-line'] ul").nth(1).scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${outDir}/${engine}-nojs-${name}.png` });
    out.noJs = await page.evaluate(() => {
      const s = document.querySelector("section[aria-labelledby='no-script-line']");
      const contact = [...s.querySelectorAll("ul")[1].querySelectorAll("li")];
      return {
        contact: contact.map((li) => { const a = li.querySelector("a"); return a ? `${a.textContent.trim()} -> ${a.getAttribute("href")}` : li.textContent.trim(); }),
        projects: s.querySelectorAll("a[href^='/work/']").length,
        sideways: document.documentElement.scrollWidth > innerWidth,
        smallTargets: [...s.querySelectorAll("a")].filter((a) => a.getBoundingClientRect().height < 44).length,
      };
    });
    const resumeA = page.locator("section[aria-labelledby='no-script-line'] a[href$='.pdf']");
    if (await resumeA.count()) {
      const res = await Promise.all([page.waitForEvent("download", { timeout: 5000 }).then(() => "download").catch(() => null), page.waitForURL("**/*.pdf", { timeout: 5000 }).then(() => "opened").catch(() => null), resumeA.click().catch((e) => String(e))]);
      out.noJs.resumeClick = res.slice(0, 2).filter(Boolean)[0] ?? "nothing";
    }
    await ctx.close();
  }
  report.sizes[name] = out;
}
console.log(JSON.stringify(report, null, 2));
await browser.close();
