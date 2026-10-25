// Colour contrast of every visible text style (Phase 7a), where axe cannot decide (gradients, layered opacity).
// For each text element: its colour (with alpha and every ancestor's opacity) against the first opaque
// background behind it (alpha-blended, the page's --void if none), grouped by style; WCAG AA needs 4.5:1, or 3:1
// for large text (24 px, or 18.66 px bold). Text over photos or video is listed separately (checked by eye).
// Usage: node scripts/qa/contrast.mjs [url] [outFile]
import { writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const url = (process.argv[2] ?? "http://localhost:8787/").replace(/\/?$/, "/");
const outFile = process.argv[3] ?? "docs/qa/phase-7a/a11y/contrast.json";
const browser = await chromium.launch({ channel: "chrome" });
const report = {};
for (const path of ["", "work/fraud-detection", "work/touch-n-go-reporting", "no-such-page"]) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(url + path, { waitUntil: "load" });
  await page.waitForTimeout(2500);
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 500) {
    await page.evaluate((y) => (window.__lenis ? window.__lenis.scrollTo(y, { immediate: true, force: true }) : window.scrollTo(0, y)), y);
    await page.waitForTimeout(200);
  }
  await page.waitForTimeout(2500);
  report["/" + path] = await page.evaluate(() => {
    // Any CSS colour (oklch, lab, named) painted into one pixel and read back as sRGB; alpha read the same way.
    const cv = document.createElement("canvas");
    cv.width = cv.height = 1;
    const ctx = cv.getContext("2d", { willReadFrequently: true });
    const memo = new Map();
    const rgba = (c) => {
      if (memo.has(c)) return memo.get(c);
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = c;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
      const out = a === 0 ? [0, 0, 0, 0] : [r, g, b, a / 255];
      memo.set(c, out);
      return out;
    };
    const parse = (c) => {
      if (!c || c === "transparent") return [0, 0, 0, 0];
      return rgba(c);
    };
    const blend = (top, bottom) => { const a = top[3]; return [0, 1, 2].map((i) => top[i] * a + bottom[i] * (1 - a)).concat(1); };
    const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
    const pageBg = parse(getComputedStyle(document.body).backgroundColor);
    const rows = new Map();
    const overMedia = new Set();
    for (const el of document.querySelectorAll("body *")) {
      if (el.closest("svg, script, style, noscript, [aria-hidden='true'], .sr-only, [hidden], template")) continue;
      if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0 || cs.visibility === "hidden" || cs.display === "none") continue;
      let opacity = 1;
      for (let p = el; p; p = p.parentElement) opacity *= +getComputedStyle(p).opacity;
      if (opacity < 0.05) continue; // not visible (faded out, or waiting to reveal)
      let fg = parse(cs.color);
      fg = [fg[0], fg[1], fg[2], fg[3] * opacity];
      // The background: the first ancestor with a colour; note any image, gradient or video on the way.
      let bg = null, media = false;
      const layers = [];
      for (let p = el; p; p = p.parentElement) {
        const ps = getComputedStyle(p);
        if (ps.backgroundImage && ps.backgroundImage !== "none" && !ps.backgroundImage.startsWith("radial-gradient") && !ps.backgroundImage.startsWith("linear-gradient")) media = true;
        if (p.querySelector(":scope > img, :scope > video, :scope > picture") && p !== el) media = media || p.contains(el) && [...p.children].some((c) => /IMG|VIDEO|PICTURE/.test(c.tagName) && c.getBoundingClientRect().width > r.width);
        const c = parse(ps.backgroundColor);
        if (c[3] > 0) { layers.push(c); if (c[3] >= 0.99) break; }
      }
      bg = layers.reverse().reduce((acc, c) => blend(c, acc), pageBg);
      const text = blend(fg, bg);
      const size = parseFloat(cs.fontSize);
      const bold = +cs.fontWeight >= 700;
      const large = size >= 24 || (bold && size >= 18.66);
      const need = large ? 3 : 4.5;
      const k = ratio(text, bg);
      const key = `${cs.color} on rgb(${bg.slice(0, 3).map(Math.round).join(",")}) · ${Math.round(size * 10) / 10}px${opacity < 0.99 ? ` · opacity ${opacity.toFixed(2)}` : ""}`;
      const sample = `${el.tagName.toLowerCase()} "${el.textContent.trim().slice(0, 36)}"`;
      if (media) { overMedia.add(sample); continue; }
      const row = rows.get(key) ?? { ratio: +k.toFixed(2), need, count: 0, samples: [] };
      row.count++;
      if (row.samples.length < 3) row.samples.push(sample);
      rows.set(key, row);
    }
    const all = [...rows.entries()].map(([style, v]) => ({ style, ...v })).sort((a, b) => a.ratio - b.ratio);
    return { styles: all.length, failing: all.filter((x) => x.ratio < x.need), lowest: all.slice(0, 8), overMedia: [...overMedia].slice(0, 20) };
  });
  await page.close();
}
await writeFile(outFile, JSON.stringify(report, null, 2));
for (const [p, r] of Object.entries(report)) {
  console.log(`## ${p}: ${r.styles} text styles, ${r.failing.length} below AA`);
  for (const f of r.failing) console.log(`  x ${f.ratio}:1 (needs ${f.need}) ${f.style}  e.g. ${f.samples.join(", ")}`);
  if (!r.failing.length) console.log(`  lowest: ${r.lowest.slice(0, 3).map((x) => `${x.ratio}:1 ${x.samples[0]}`).join(" | ")}`);
  if (r.overMedia.length) console.log(`  over images or video (by eye): ${r.overMedia.join(" | ")}`);
}
await browser.close();
