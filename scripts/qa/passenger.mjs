// Phase 5d check: the passenger counter through `pnpm preview` (run on a fresh local count of 0).
// Usage: node scripts/qa/passenger.mjs [url] [outDir] [--engine=chrome|webkit]
//
// - the first browser gets number 1, a second browser profile number 2, and a reload keeps the number with
//   no new call;
// - with the endpoint failing, or storage blocked, the element stays hidden (and nothing is shown);
// - the route rejects other methods, cross-origin calls, a body and bots, and rate-limits (5 a minute);
// - screen readers get one line: "You are passenger number N".
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, webkit } from "playwright";

const url = (process.argv[2] ?? "http://localhost:8787/").replace(/\/?$/, "/");
const outDir = process.argv[3] ?? "docs/qa/phase-5d";
const engine = (process.argv.find((a) => a.startsWith("--engine=")) ?? "--engine=chrome").slice(9);
// Headless browsers say "HeadlessChrome", which the counter rightly treats as a bot.
const UA =
  engine === "webkit"
    ? "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15"
    : "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
await mkdir(outDir, { recursive: true });
const browser = engine === "chrome" ? await chromium.launch({ channel: "chrome" }) : await webkit.launch();
const report = { engine, url };

async function visit(context, label) {
  const page = await context.newPage();
  const calls = [];
  page.on("request", (r) => r.url().endsWith("/api/passenger") && calls.push(r.method()));
  await page.goto(url, { waitUntil: "load" });
  await page.waitForTimeout(5500);
  const shown = await page.evaluate(() => {
    const el = document.querySelector("section [class*='passenger']");
    return el
      ? { sr: el.querySelector(".sr-only")?.textContent, tiles: [...el.querySelectorAll("[data-target]")].map((t) => t.dataset.target).join(""), opacity: getComputedStyle(el).opacity }
      : null;
  });
  const saved = await page.evaluate(() => {
    try {
      return localStorage.getItem("jbbru:passenger");
    } catch {
      return "storage blocked";
    }
  });
  if (label) await page.screenshot({ path: `${outDir}/${engine}-passenger-${label}.png`, clip: { x: 0, y: 0, width: page.viewportSize().width, height: page.viewportSize().height } });
  await page.close();
  return { calls, shown, saved };
}

// First browser, its reload, and a second browser profile.
const a = await browser.newContext({ userAgent: UA, viewport: { width: 1440, height: 900 } });
report.first = await visit(a, "first");
report.reload = await visit(a, null);
await a.close();
const b = await browser.newContext({ userAgent: UA, viewport: { width: 1440, height: 900 } });
report.second = await visit(b, "second");
await b.close();

// The endpoint failing: hidden.
const c = await browser.newContext({ userAgent: UA, viewport: { width: 1440, height: 900 } });
await c.route("**/api/passenger", (r) => r.fulfill({ status: 500, body: "{}" }));
report.failing = await visit(c, null);
await c.close();

// Storage blocked: hidden, and no call at all (it could never be remembered).
const d = await browser.newContext({ userAgent: UA, viewport: { width: 1440, height: 900 } });
await d.addInitScript(() => {
  Object.defineProperty(window, "localStorage", { get() { throw new DOMException("blocked", "SecurityError"); } });
});
report.storageBlocked = await visit(d, null);
await d.close();

// The route's rules, from Node (no browser), with the page's own origin.
const origin = new URL(url).origin;
const call = async (init) => {
  const res = await fetch(`${origin}/api/passenger`, init);
  return { status: res.status, body: await res.text() };
};
const ok = { "User-Agent": UA, Origin: origin, "Sec-Fetch-Site": "same-origin" };
report.rules = {
  get: await call({ method: "GET", headers: ok }),
  crossOrigin: await call({ method: "POST", headers: { ...ok, Origin: "https://example.com", "Sec-Fetch-Site": "cross-site" } }),
  withBody: await call({ method: "POST", headers: { ...ok, "Content-Type": "application/json" }, body: '{"x":1}' }),
  bot: await call({ method: "POST", headers: { ...ok, "User-Agent": "Googlebot/2.1 (+http://www.google.com/bot.html)" } }),
  noUserAgent: await call({ method: "POST", headers: { Origin: origin, "Sec-Fetch-Site": "same-origin", "User-Agent": "" } }),
};
const burst = [];
for (let i = 0; i < 7; i++) burst.push((await call({ method: "POST", headers: ok })).status);
report.rules.rateLimitBurst = burst;

await writeFile(`${outDir}/${engine}-passenger.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();
