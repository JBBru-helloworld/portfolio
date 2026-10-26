// Phase 6 regression probe (owner's report): logo first paint, scroll after a landing refresh, the dusk
// before the board, and the covered scene behind My journey. Usage: node scripts/qa/regress6.mjs [url] [engine] [runs]
import { chromium, firefox, webkit } from "playwright";
import { noCounter } from "./no-counter.mjs";
const url = (process.argv[2] ?? "http://localhost:8787").replace(/\/$/, "");
const engine = process.argv[3] ?? "chrome";
const runs = Number(process.argv[4] ?? 4);
const b = engine === "webkit" ? await webkit.launch() : engine === "firefox" ? await firefox.launch() : await chromium.launch({ channel: "chrome" });
noCounter(b);
const out = { engine, logo: [], scroll: [], dusk: [], covered: [] };
for (let i = 0; i < runs; i++) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  // Logo size at every frame from the start (largest seen while the page loads).
  await p.addInitScript(() => {
    window.__logoMax = 0;
    const tick = () => {
      const s = document.querySelector("section a[aria-label$=', home'] svg");
      if (s) window.__logoMax = Math.max(window.__logoMax, s.getBoundingClientRect().width);
      if (performance.now() < 4000) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await p.goto(url + "/", { waitUntil: "load" });
  await p.waitForFunction(() => document.querySelector("section[data-phase]")?.dataset.phase === "open", null, { timeout: 20000 }).catch(() => null);
  await p.waitForTimeout(600);
  out.logo.push(Math.round(await p.evaluate(() => window.__logoMax)));
  // Scroll: three wheel steps from the landing.
  const y0 = await p.evaluate(() => scrollY);
  for (let k = 0; k < 3; k++) { await p.mouse.wheel(0, 400); await p.waitForTimeout(250); }
  await p.waitForTimeout(500);
  out.scroll.push(Math.round((await p.evaluate(() => scrollY)) - y0));
  // Dusk: scroll (wheel) until the board's top is at 70% of the viewport; sample the top strip's brightness.
  for (let k = 0; k < 120; k++) {
    const t = await p.evaluate(() => document.getElementById("departures").getBoundingClientRect().top / innerHeight);
    if (t <= 0.7) break;
    await p.mouse.wheel(0, 120);
    await p.waitForTimeout(40);
  }
  await p.waitForTimeout(700);
  const shot = await p.screenshot({ clip: { x: 0, y: 0, width: 1440, height: 200 } });
  const dusk = await p.evaluate(async (b64) => {
    const img = new Image(); img.src = "data:image/png;base64," + b64; await img.decode();
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; const g = c.getContext("2d"); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += (d[i] + d[i + 1] + d[i + 2]) / 3; return Math.round(s / (d.length / 4));
  }, shot.toString("base64"));
  out.dusk.push({ brightness: dusk, fade: await p.evaluate(() => getComputedStyle(document.querySelector("section [class*='fade']")).opacity), white: await p.evaluate(() => getComputedStyle(document.querySelector("section [class*='white']")).opacity) });
  // Covered: scroll on to My journey; the scene must be covered, and the area beside the passport dark.
  for (let k = 0; k < 160; k++) {
    const t = await p.evaluate(() => document.getElementById("journey").getBoundingClientRect().top);
    if (t <= 80) break;
    await p.mouse.wheel(0, 160);
    await p.waitForTimeout(30);
  }
  await p.waitForTimeout(800);
  const beside = await p.screenshot({ clip: { x: 0, y: 300, width: 60, height: 400 } });
  const bright = await p.evaluate(async (b64) => {
    const img = new Image(); img.src = "data:image/png;base64," + b64; await img.decode();
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; const g = c.getContext("2d"); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += (d[i] + d[i + 1] + d[i + 2]) / 3; return Math.round(s / (d.length / 4));
  }, beside.toString("base64"));
  out.covered.push({ boardCovered: await p.evaluate(() => document.querySelector("section[data-phase]")?.dataset.boardCovered), besidePassport: bright });
  await ctx.close();
}
console.log(JSON.stringify(out));
await b.close();
