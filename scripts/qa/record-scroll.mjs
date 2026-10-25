// A full scroll from the landing to the footer, recorded for the owner to watch (Phase 6).
// Real wheel input (Lenis and ScrollTrigger as a visitor gets them), a steady pace through the landing
// sequence, a short pause as each section arrives, then on to the footer.
// Usage: node scripts/qa/record-scroll.mjs [url] [outFile] [--engine=chrome|webkit]
import { mkdir, rename, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { chromium, webkit } from "playwright";

const url = (process.argv[2] ?? "http://localhost:8787/").replace(/\/?$/, "/");
const outFile = process.argv[3] ?? "docs/qa/phase-6/full-scroll-1440.webm";
const engine = process.argv.find((a) => a.startsWith("--engine="))?.slice(9) ?? "chrome";
const dir = join(dirname(outFile), "_rec");
await rm(dir, { recursive: true, force: true });
await mkdir(dir, { recursive: true });

const browser = engine === "webkit" ? await webkit.launch() : await chromium.launch({ channel: "chrome" });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir, size: { width: 1440, height: 900 } } });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && !/40[39]|429/.test(m.text()) && errors.push(m.text()));

await page.goto(url, { waitUntil: "load" });
await page.waitForFunction(() => document.querySelector("section[data-phase]")?.dataset.phase === "open", null, { timeout: 30000 });
await page.waitForTimeout(2500); // the shade has lifted; the greeting shows
await page.mouse.move(720, 450);

const y = () => page.evaluate(() => scrollY);
const top = (id) => page.evaluate((id) => document.getElementById(id)?.getBoundingClientRect().top ?? 1e9, id);
const wheelUntil = async (done, step, gap) => {
  for (let i = 0; i < 2000 && !(await done()); i++) {
    await page.mouse.wheel(0, step);
    await page.waitForTimeout(gap);
  }
};

// The landing sequence: push, cloud, dusk and the curtain rise, until the board is at the top.
await wheelUntil(async () => (await top("departures")) <= 0, 40, 60);
await page.waitForTimeout(3000); // the board flips in
const sections = await page.evaluate(() => [...document.querySelectorAll("main > section[id], main section[id][aria-labelledby]")].map((s) => s.id).filter((id, i, a) => id !== "departures" && a.indexOf(id) === i));
const timeline = [{ at: "departures", y: await y() }];
for (const id of sections) {
  await wheelUntil(async () => (await top(id)) <= 40, 60, 45);
  timeline.push({ at: id, y: await y() });
  await page.waitForTimeout(2200);
}
// On to the footer.
await wheelUntil(async () => page.evaluate(() => innerHeight + scrollY >= document.documentElement.scrollHeight - 2), 60, 45);
timeline.push({ at: "footer", y: await y() });
await page.waitForTimeout(2500);

const video = page.video();
await context.close();
await rename(await video.path(), outFile);
await rm(dir, { recursive: true, force: true });
await browser.close();
console.log(JSON.stringify({ outFile, sections: timeline, errors }, null, 2));
