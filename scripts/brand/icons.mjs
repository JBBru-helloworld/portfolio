// `pnpm brand:build`: the JB tail-fin icon (Phase 6), drawn from the owner's sketch
// (assets/brand/tailfin-reference.png, measured in a 2000 x 2000 square) and his monogram
// (src/components/brand/jb-logo.svg).
//
// - The fin: a flat base, a vertical foot curving into a long swept leading edge, a flat top and a trailing
//   edge leaning slightly back. One slanted stripe near the trailing edge, parallel to it, and the JB are
//   transparent cut-outs (an SVG mask), so the mark works on any background.
// - The JB is scaled to fill most of the solid area left of the stripe, centred there with a clear margin
//   from every edge (the curved leading edge above all), and its lines thickened to about twice their weight.
// - Two versions: the full fin (stripe and JB) for 180 px and above, and the fin with its stripe only for
//   16 and 32 px, where the JB would be too small to read.
//
// Writes: src/components/brand/tailfin.svg and tailfin-small.svg (the marks, in currentColor), the site's
// icons (src/app/icon.svg, favicon.ico, apple-icon.png, public/icons/icon-192.png and icon-512.png: the fin
// in --paper on --void), and docs/qa/phase-6/icons-review.png (16, 32, 180 and 512 px on dark and light tabs,
// beside the sketch) for the owner's approval.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";

const ROOT = new URL("../..", import.meta.url).pathname;
const PAPER = "#F5F5F2";
const VOID = "#0A0A0A";

// ---------- The fin, from the sketch ----------
const BASE_Y = 1715;
const FOOT_X = 113;
const FOOT_TOP = 1392; // where the vertical foot starts curving
const CURVE_END = [460, 1225]; // where the curve meets the straight leading edge
const TOP = [1285, 220]; // top of the leading edge
const TOP_RIGHT = [1818, 220];
const TRAIL_BASE = [1498, BASE_Y];
const FIN = [
  `M ${FOOT_X} ${BASE_Y}`,
  `L ${FOOT_X} ${FOOT_TOP}`,
  // The foot curves smoothly into the leading edge (tangent to the edge's slope at CURVE_END).
  `C ${FOOT_X + 190} ${FOOT_TOP} ${CURVE_END[0] - 95} ${CURVE_END[1] + 115} ${CURVE_END[0]} ${CURVE_END[1]}`,
  `L ${TOP[0]} ${TOP[1]}`,
  `L ${TOP_RIGHT[0]} ${TOP_RIGHT[1]}`,
  `L ${TRAIL_BASE[0]} ${TRAIL_BASE[1]}`,
  "Z",
].join(" ");

// The stripe: parallel to the trailing edge (the sketch: top 1386 to 1555 at y 433, bottom 1153 to 1326 at
// y 1525).
const STRIPE = { top: 433, bottom: 1525, topX: [1386, 1555], bottomX: [1153, 1326] };
const STRIPE_PATH = `M ${STRIPE.topX[0]} ${STRIPE.top} L ${STRIPE.topX[1]} ${STRIPE.top} L ${STRIPE.bottomX[1]} ${STRIPE.bottom} L ${STRIPE.bottomX[0]} ${STRIPE.bottom} Z`;
const stripeLeftX = (y) => STRIPE.bottomX[0] + ((STRIPE.bottom - y) * (STRIPE.topX[0] - STRIPE.bottomX[0])) / (STRIPE.bottom - STRIPE.top);
// The leading edge's x at a height (the straight part; below the curve, the foot).
const leadingX = (y) => {
  if (y <= CURVE_END[1]) return CURVE_END[0] + ((CURVE_END[1] - y) * (TOP[0] - CURVE_END[0])) / (CURVE_END[1] - TOP[1]);
  if (y >= FOOT_TOP) return FOOT_X;
  // Through the curve: a straight approximation between its ends, a little inside it (safe for the margin).
  const t = (y - CURVE_END[1]) / (FOOT_TOP - CURVE_END[1]);
  return CURVE_END[0] + t * (FOOT_X - CURVE_END[0]);
};

// ---------- The JB, fitted left of the stripe ----------
const logo = await readFile(join(ROOT, "src/components/brand/jb-logo.svg"), "utf8");
const JB_PATH = logo.match(/ d="([^"]+)"/)[1];
const JB = { w: 1158, h: 747, stroke: 17.8 }; // its own units; the drawing's lines are about 17.8 thick
// The monogram's ink, sampled as points (fractions of its box): the J's top bar starts 22% in, the J's bowl
// reaches the left edge from about 60% down, the B's bowls reach the right edge.
const INK = [
  [0.22, 0], [1.0 * 0.904, 0], [0.0, 0.6], [0.0, 0.75], [0.1, 0.97], [0.5, 1], [0.86, 1], [1, 0.72], [0.98, 0.45],
];
const MARGIN = 70; // from every edge of the solid area, in fin units (about 4% of the icon)

function fits(x0, y0, w) {
  const h = (w * JB.h) / JB.w;
  return INK.every(([fx, fy]) => {
    const x = x0 + fx * w;
    const y = y0 + fy * h;
    const left = leadingX(y) + MARGIN;
    const right = (y < STRIPE.bottom ? stripeLeftX(y) : stripeLeftX(STRIPE.bottom)) - MARGIN;
    return x >= left && x <= right && y <= BASE_Y - MARGIN && y >= TOP[1] + MARGIN;
  });
}

// The largest monogram that fits, then centred in the room it has at that size.
let best = null;
for (let w = 1100; w >= 300 && !best; w -= 5) {
  const h = (w * JB.h) / JB.w;
  const spots = [];
  for (let y0 = TOP[1]; y0 + h <= BASE_Y - MARGIN; y0 += 10)
    for (let x0 = FOOT_X; x0 + w <= TRAIL_BASE[0]; x0 += 10) if (fits(x0, y0, w)) spots.push([x0, y0]);
  if (spots.length) {
    const xs = spots.map((s) => s[0]);
    const ys = spots.map((s) => s[1]);
    // Centre of the room: the middle of the feasible positions (lowest band, as the fin is widest there).
    const yMax = Math.max(...ys);
    const yMin = Math.min(...ys);
    const yc = (yMin + yMax) / 2;
    const row = spots.filter((s) => Math.abs(s[1] - yc) <= 10);
    const rx = row.map((s) => s[0]);
    best = { w, h, x0: (Math.min(...rx) + Math.max(...rx)) / 2, y0: yc, room: { x: [Math.min(...xs), Math.max(...xs)], y: [yMin, yMax] } };
  }
}
if (!best) throw new Error("icons: the monogram does not fit");
const scale = best.w / JB.w;
const JB_MASK = `<g transform="translate(${best.x0.toFixed(1)} ${best.y0.toFixed(1)}) scale(${scale.toFixed(4)})"><path d="${JB_PATH}" fill="black" stroke="black" stroke-width="${JB.stroke.toFixed(1)}" stroke-linejoin="round"/></g>`;

// The square: the fin (1705 x 1495) centred with an even margin.
const VIEW = (() => {
  const w = TOP_RIGHT[0] - FOOT_X;
  const h = BASE_Y - TOP[1];
  const side = Math.round(w * 1.1);
  return { x: Math.round(FOOT_X + w / 2 - side / 2), y: Math.round(TOP[1] + h / 2 - side / 2), side };
})();
const viewBox = `${VIEW.x} ${VIEW.y} ${VIEW.side} ${VIEW.side}`;

// Each drawing gets its own mask id (several share a page in the review sheet).
let ids = 0;
const mark = (withJb, colour = "currentColor", id = `cut${ids++}`) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">
  <defs><mask id="${id}" maskUnits="userSpaceOnUse" x="${VIEW.x}" y="${VIEW.y}" width="${VIEW.side}" height="${VIEW.side}">
    <rect x="${VIEW.x}" y="${VIEW.y}" width="${VIEW.side}" height="${VIEW.side}" fill="white"/>
    <path d="${STRIPE_PATH}" fill="black"/>${withJb ? `\n    ${JB_MASK}` : ""}
  </mask></defs>
  <path d="${FIN}" fill="${colour}" mask="url(#${id})"/>
</svg>
`;

// An icon tile: the fin in paper on void (rounded for the favicon, square for the touch and manifest icons).
const tile = (withJb, rounded, id = `cut${ids++}`) => {
  // The small (16 and 32 px) tile is cropped close, so the fin fills it.
  const pad = VIEW.side * (withJb ? 0.1 : -0.02);
  const s = VIEW.side + pad * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEW.x - pad} ${VIEW.y - pad} ${s} ${s}">
  <rect x="${VIEW.x - pad}" y="${VIEW.y - pad}" width="${s}" height="${s}" rx="${rounded ? s * 0.18 : 0}" fill="${VOID}"/>
  <defs><mask id="${id}" maskUnits="userSpaceOnUse" x="${VIEW.x}" y="${VIEW.y}" width="${VIEW.side}" height="${VIEW.side}">
    <rect x="${VIEW.x}" y="${VIEW.y}" width="${VIEW.side}" height="${VIEW.side}" fill="white"/>
    <path d="${STRIPE_PATH}" fill="black"/>${withJb ? `\n    ${JB_MASK}` : ""}
  </mask></defs>
  <path d="${FIN}" fill="${PAPER}" mask="url(#${id})"/>
</svg>
`;
};

await mkdir(join(ROOT, "public/icons"), { recursive: true });
await mkdir(join(ROOT, "docs/qa/phase-6"), { recursive: true });
await writeFile(join(ROOT, "src/components/brand/tailfin.svg"), mark(true));
await writeFile(join(ROOT, "src/components/brand/tailfin-small.svg"), mark(false));
// The SVG favicon is the small version (it is shown at 16 and 32 px).
await writeFile(join(ROOT, "src/app/icon.svg"), tile(false, true));

const browser = await chromium.launch();
const page = await browser.newPage();
async function png(svg, size, path) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<!doctype html><html><body style="margin:0;background:transparent">${svg.replace("<svg ", `<svg width="${size}" height="${size}" `)}</body></html>`);
  return page.screenshot({ path, omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
}
await png(tile(true, false), 180, join(ROOT, "src/app/apple-icon.png"));
await png(tile(true, false), 192, join(ROOT, "public/icons/icon-192.png"));
await png(tile(true, false), 512, join(ROOT, "public/icons/icon-512.png"));
const ico16 = await png(tile(false, true), 16, join(ROOT, "public/icons/.f16.png"));
const ico32 = await png(tile(false, true), 32, join(ROOT, "public/icons/.f32.png"));

// favicon.ico: the 16 and 32 px PNGs in one ICO (PNG-compressed entries).
function ico(images) {
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, data }, i) => {
    const e = 6 + 16 * i;
    header.writeUInt8(size, e);
    header.writeUInt8(size, e + 1);
    header.writeUInt16LE(1, e + 4);
    header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(data.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...images.map((im) => im.data)]);
}
await writeFile(join(ROOT, "src/app/favicon.ico"), ico([{ size: 16, data: ico16 }, { size: 32, data: ico32 }]));
const { rm } = await import("node:fs/promises");
await rm(join(ROOT, "public/icons/.f16.png"));
await rm(join(ROOT, "public/icons/.f32.png"));

// The review sheet: the sketch, then 16, 32, 180 and 512 px on a dark and a light browser tab.
const sketch = `data:image/png;base64,${(await readFile(join(ROOT, "assets/brand/tailfin-reference.png"))).toString("base64")}`;
const cell = (svg, size, bg, label) => `<figure style="margin:0;display:grid;justify-items:center;gap:10px">
  <div style="background:${bg};padding:18px;border-radius:10px;display:grid;place-items:center;min-width:${Math.max(size, 40)}px;min-height:${Math.max(size, 40)}px">${svg.replace("<svg ", `<svg width="${size}" height="${size}" `)}</div>
  <figcaption style="font:12px ui-monospace,monospace;color:#888">${label}</figcaption></figure>`;
const row = (bg, name) => `<div style="display:flex;align-items:end;gap:28px;padding:20px 24px">
  <span style="font:13px ui-monospace,monospace;color:#888;width:90px">${name}</span>
  ${cell(tile(false, true), 16, bg, "16 · fin + stripe")}${cell(tile(false, true), 32, bg, "32 · fin + stripe")}
  ${cell(tile(true, false), 180, bg, "180 · full")}${cell(tile(true, false), 512, bg, "512 · full")}
  ${cell(mark(true, bg === "#ffffff" ? VOID : PAPER), 220, bg, "the mark (cut-outs)")}</div>`;
await page.setViewportSize({ width: 1600, height: 1500 });
await page.setContent(`<!doctype html><html><body style="margin:0;background:#2a2a2a;font-family:sans-serif">
  <div style="display:flex;gap:24px;align-items:center;padding:24px"><img src="${sketch}" style="width:300px;background:#fff;border-radius:8px"><p style="font:14px ui-monospace,monospace;color:#bbb;max-width:700px">The owner's sketch (left), and the icon drawn from it: the fin in --paper on --void, the stripe and the JB as transparent cut-outs. Rows: a dark tab, then a light tab.</p></div>
  ${row("#202124", "dark tab")}${row("#ffffff", "light tab")}</body></html>`);
await page.screenshot({ path: join(ROOT, "docs/qa/phase-6/icons-review.png"), fullPage: true });
await browser.close();
console.log(`icons: JB at (${best.x0.toFixed(0)}, ${best.y0.toFixed(0)}), ${best.w} x ${best.h.toFixed(0)} fin units (room x ${best.room.x}, y ${best.room.y}); viewBox ${viewBox}`);
