// `pnpm og:build [url]`: the Open Graph and Twitter share cards (Phase 6; Phase 7a fixes), 1200 x 630 PNGs in
// public/og/, named for what they show (src/lib/site.ts gives the same names to the page metadata).
//
// - joshua-bonham-software-ml-engineer.png: the landing's window, photographed from a running server (`pnpm dev`
//   or `pnpm preview`; default http://localhost:3000) once the shade is open, set to the right, with the name
//   and role large on the left so they still read as a small thumbnail (LinkedIn, WhatsApp, X).
// - joshua-bonham-<slug>.png for every project: its tail-fin emblem (the site's own geometry), flight code and
//   name, in the site's fonts and colours, with "JB AIR · JOSHUA BONHAM" and the JB fin small at the foot.
import { mkdir, readFile, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";
import { projects } from "../../src/content/projects.ts";
import { profile } from "../../src/content/profile.ts";
import { BASE, FIN, LETTERS, LIVERY_SHAPES } from "../../src/components/work/emblem-geometry.ts";

const ROOT = new URL("../..", import.meta.url).pathname;
const OUT = join(ROOT, "public/og");
const url = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const W = 1200;
const H = 630;
const C = { void: "#0A0A0A", cabin: "#141414", g1: "#1E1E1E", g2: "#333333", g3: "#636363", g4: "#8A8A8A", paper: "#F5F5F2", muted: "#BEBEBB", amber: "#D1A56F" };

await mkdir(OUT, { recursive: true });
// Cards from older builds (other names) are removed, so only the current set ships.
for (const f of await readdir(OUT)) if (f.endsWith(".png")) await rm(join(OUT, f));
const font = async (file) => `data:font/woff2;base64,${(await readFile(join(ROOT, "src/fonts", file))).toString("base64")}`;
const sans = await font("InstrumentSans-Latin-wght400-600.woff2");
const mono = await font("JetBrainsMono-Latin-wght400-500.woff2");
const fin = (await readFile(join(ROOT, "src/components/brand/tailfin.svg"), "utf8")).replace("currentColor", C.g3);

const browser = await chromium.launch({ channel: "chrome" });

// ---------- The home card: the window, with the name and role large ----------
{
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.goto(url + "/", { waitUntil: "load" });
  await page.waitForFunction(() => document.querySelector("section[data-phase]")?.dataset.phase === "open", null, { timeout: 30000 });
  // The window alone: every piece of landing text hidden.
  await page.addStyleTag({
    content: `section a[aria-label$=", home"], section [class*="deck"], section [class*="passenger"], section [class*="cue"], section h1, section [class*="title"], nextjs-portal { visibility: hidden !important; }`,
  });
  await page.waitForTimeout(1200);
  const window = `data:image/png;base64,${(await page.screenshot()).toString("base64")}`;
  await page.close();
  // A fresh, blank page for the card: the site's own CSP (font-src 'self') would block the embedded fonts.
  const card = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await card.setContent(`<!doctype html><html><head><style>
    @font-face { font-family: "S"; src: url("${sans}") format("woff2"); font-weight: 400 600; }
    @font-face { font-family: "M"; src: url("${mono}") format("woff2"); font-weight: 400 500; }
    html, body { margin: 0; width: ${W}px; height: ${H}px; background: ${C.void}; overflow: hidden; }
    .window { position: absolute; top: 0; left: 300px; width: ${W}px; height: ${H}px;
      -webkit-mask: linear-gradient(to right, transparent 0, #000 30%); mask: linear-gradient(to right, transparent 0, #000 30%); }
    .text { position: absolute; left: 80px; top: 50%; transform: translateY(-50%); }
    .name { margin: 0; font: 500 92px/1.02 "S"; letter-spacing: -0.02em; color: ${C.paper}; }
    .role { margin: 22px 0 0; font: 400 40px/1.2 "S"; color: ${C.muted}; }
    .site { margin: 34px 0 0; font: 500 18px/1 "M"; letter-spacing: 0.22em; color: ${C.g4}; }
  </style></head><body>
    <img class="window" src="${window}" alt="">
    <div class="text"><p class="name">${profile.name.replace(" ", "<br>")}</p><p class="role">${profile.roleLines.default}</p><p class="site">JBBRU.COM</p></div>
  </body></html>`);
  await card.evaluate(() => document.fonts.ready);
  await card.screenshot({ path: join(OUT, "joshua-bonham-software-ml-engineer.png") });
  await card.close();
}

// ---------- A card per project ----------
const emblem = (e, size) => {
  const shapes = LIVERY_SHAPES[e.livery]
    .map((s) =>
      s.kind === "path"
        ? `<path d="${s.d}" stroke-width="${s.strokeWidth}" fill="none"/>`
        : s.kind === "rect"
          ? `<rect x="${s.x}" y="${s.y}" width="${s.width}" height="${s.height}" stroke="none"/>`
          : `<circle cx="${s.cx}" cy="${s.cy}" r="${s.r}" stroke="none"/>`,
    )
    .join("");
  return `<svg viewBox="0 0 48 48" width="${size}" height="${size}" style="overflow:visible">
    <defs><clipPath id="c"><path d="${FIN}"/></clipPath></defs>
    <path d="${FIN}" fill="${C.cabin}"/>
    <g clip-path="url(#c)" fill="${C.amber}" stroke="${C.amber}">${shapes}</g>
    <path d="${FIN}" fill="none" stroke="${C.g3}" stroke-width="0.6"/>
    <line x1="${BASE.x1}" y1="${BASE.y}" x2="${BASE.x2}" y2="${BASE.y}" stroke="${C.g3}" stroke-width="0.6"/>
    <text x="${LETTERS.x}" y="${LETTERS.y}" text-anchor="middle" font-family="M" font-weight="500" font-size="9.5" letter-spacing="0.4" fill="${C.paper}">${e.letters}</text>
  </svg>`;
};
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
for (const p of projects) {
  await page.setContent(`<!doctype html><html><head><style>
    @font-face { font-family: "S"; src: url("${sans}") format("woff2"); font-weight: 400 600; }
    @font-face { font-family: "M"; src: url("${mono}") format("woff2"); font-weight: 400 500; }
    html, body { margin: 0; width: ${W}px; height: ${H}px; background: ${C.void}; color: ${C.paper}; overflow: hidden; }
    body { display: grid; grid-template-columns: 380px 1fr; align-items: center; padding: 0 80px; box-sizing: border-box; gap: 56px;
      background: radial-gradient(90% 120% at 20% 50%, ${C.g1}, ${C.void} 70%); }
    .code { font: 500 26px/1 "M"; letter-spacing: 0.24em; color: ${C.muted}; margin: 0 0 22px; }
    .name { font: 500 64px/1.08 "S"; margin: 0 0 26px; letter-spacing: -0.01em; }
    .summary { font: 400 26px/1.45 "S"; color: ${C.muted}; margin: 0; max-width: 620px; }
    .foot { position: absolute; left: 80px; right: 80px; bottom: 44px; display: flex; justify-content: space-between; align-items: center;
      font: 500 18px/1 "M"; letter-spacing: 0.22em; color: ${C.g4}; }
    .foot svg { width: 44px; height: 44px; }
  </style></head><body>
    <div>${emblem(p.emblem, 340)}</div>
    <div><p class="code">${p.flight}</p><h1 class="name">${p.name}</h1><p class="summary">${p.summary}</p></div>
    <div class="foot"><span>JB AIR · ${profile.name.toUpperCase()}</span>${fin}</div>
  </body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(OUT, `joshua-bonham-${p.slug}.png`) });
}
await browser.close();
console.log(`og: the home card and ${projects.length} project cards in public/og/`);
