// Passport stamps, step 1: renders each stamp's clean SVG (shape and lettering, white on transparent) to a
// PNG with the self-hosted JetBrains Mono, from the content in src/content/journey.ts. Step 2 (ink.py)
// wears the ink and writes the shipped masks. Run both with `pnpm stamps:build`.
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { webkit } from "playwright";
import { journey } from "../../src/content/journey.ts";

const ROOT = new URL("../..", import.meta.url).pathname;
const OUT = join(ROOT, "assets", "stamps");
const SCALE = 3; // render at 3x the viewBox, worn and downscaled later
await mkdir(OUT, { recursive: true });

// Inlined: WebKit will not load a file:// font into a page set with setContent.
const font = `data:font/woff2;base64,${(await readFile(join(ROOT, "src/fonts/JetBrainsMono-Latin-wght400-500.woff2"))).toString("base64")}`;
const t = (x, y, size, text, extra = "") =>
  `<text x="${x}" y="${y}" font-size="${size}" text-anchor="middle" ${extra}>${text}</text>`;

/** South Africa: a circle with a double ring, the country round the top and the word round the bottom. */
function circle(s) {
  return {
    w: 240,
    h: 240,
    body: `
      <circle cx="120" cy="120" r="113" fill="none" stroke="#fff" stroke-width="6"/>
      <circle cx="120" cy="120" r="102" fill="none" stroke="#fff" stroke-width="2"/>
      <circle cx="120" cy="120" r="64" fill="none" stroke="#fff" stroke-width="2"/>
      <path id="top" d="M 40 120 A 80 80 0 0 1 200 120" fill="none"/>
      <path id="bottom" d="M 32 120 A 88 88 0 0 0 208 120" fill="none"/>
      <text font-size="19" letter-spacing="3"><textPath href="#top" startOffset="50%" text-anchor="middle">${s.country}</textPath></text>
      <text font-size="15" letter-spacing="4"><textPath href="#bottom" startOffset="50%" text-anchor="middle">${s.word}</textPath></text>
      <circle cx="31" cy="120" r="3.5" fill="#fff"/><circle cx="209" cy="120" r="3.5" fill="#fff"/>
      ${t(120, 125, 40, s.port, 'letter-spacing="3"')}
      ${t(120, 155, 21, s.year, 'letter-spacing="2"')}`,
  };
}

/** Mauritius: a rounded rectangle with an inner rule. */
function rounded(s) {
  return {
    w: 300,
    h: 190,
    body: `
      <rect x="5" y="5" width="290" height="180" rx="24" fill="none" stroke="#fff" stroke-width="6"/>
      <rect x="15" y="15" width="270" height="160" rx="15" fill="none" stroke="#fff" stroke-width="1.6"/>
      ${t(150, 52, 24, s.country, 'letter-spacing="6"')}
      <line x1="34" y1="66" x2="266" y2="66" stroke="#fff" stroke-width="1.6"/>
      ${t(150, 122, 52, s.port, 'letter-spacing="8"')}
      <line x1="34" y1="138" x2="266" y2="138" stroke="#fff" stroke-width="1.6"/>
      <text x="38" y="163" font-size="17" letter-spacing="3">${s.word}</text>
      <text x="262" y="163" font-size="20" letter-spacing="2" text-anchor="end">${s.year}</text>`,
  };
}

/** Malaysia: an octagon with an inner octagon. */
function octagon(s) {
  const oct = (inset) => {
    const a = 70 - inset * 0.4;
    const [w, h] = [260, 230];
    const p = [
      [a, inset], [w - a, inset], [w - inset, a], [w - inset, h - a], [w - a, h - inset], [a, h - inset], [inset, h - a], [inset, a],
    ];
    return p.map((q) => q.join(",")).join(" ");
  };
  return {
    w: 260,
    h: 230,
    body: `
      <polygon points="${oct(5)}" fill="none" stroke="#fff" stroke-width="6" stroke-linejoin="round"/>
      <polygon points="${oct(16)}" fill="none" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/>
      ${t(130, 72, 23, s.country, 'letter-spacing="5"')}
      ${t(130, 132, 54, s.port, 'letter-spacing="8"')}
      <line x1="56" y1="150" x2="204" y2="150" stroke="#fff" stroke-width="1.6"/>
      ${t(130, 178, 19, `${s.word} · ${s.year}`, 'letter-spacing="3"')}`,
  };
}

const SHAPES = { za: circle, mu: rounded, my: octagon };

const browser = await webkit.launch();
const page = await browser.newPage({ deviceScaleFactor: SCALE });
for (const entry of journey) {
  const stamp = { country: entry.country.toUpperCase(), port: entry.stamp.port, word: entry.stamp.word, year: entry.stamp.year };
  const { w, h, body } = SHAPES[entry.ink](stamp);
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<!doctype html><html><head><style>
    @font-face { font-family: "JB"; src: url("${font}") format("woff2"); font-weight: 400 500; }
    html, body { margin: 0; background: transparent; }
    svg { display: block; font-family: "JB"; font-weight: 500; fill: #fff; }
  </style></head><body>
    <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>
  </body></html>`);
  const loaded = await page.evaluate(async () => {
    await document.fonts.ready;
    return document.fonts.check('500 20px "JB"');
  });
  if (!loaded) throw new Error("stamps: JetBrains Mono did not load");
  await page.screenshot({ path: join(OUT, `clean-${entry.ink}.png`), omitBackground: true });
  console.log(`stamps: rendered ${entry.ink} (${w}x${h} at ${SCALE}x)`);
}
await browser.close();
