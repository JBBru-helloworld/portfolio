/*
 * Places the X-ray objects inside a bag's packing area (a polygon from `pnpm bags:build`), largest first,
 * without overlaps. Pure arithmetic on the polygon, so nothing is measured on the page.
 *
 * Sizes follow the share (side proportional to its square root, so the area follows the share), with a
 * minimum so small ones stay visible. Each object is a square; candidate positions are tried from the
 * area's centre outwards, and if one does not fit, every size shrinks a little and the packing starts again.
 */

export interface Placed {
  id: string;
  /** Centre and side, as fractions of the bag image's width (x, size) and height (y). */
  x: number;
  y: number;
  size: number;
}

type Point = [number, number];

function inside(p: Point, poly: Point[]): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/**
 * @param objects the explanation, sorted by share, largest first
 * @param polygon the packing area in fractions of the image (x of width, y of height)
 * @param aspect the image's width over height
 */
export function pack(objects: { id: string; share: number }[], polygon: Point[], aspect: number): Placed[] {
  // Work in width units: y is scaled so a square is square.
  const poly: Point[] = polygon.map(([x, y]) => [x, y / aspect]);
  const xs = poly.map((p) => p[0]);
  const ys = poly.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const span = x1 - x0;

  // Candidate centres on a grid, nearest the middle first.
  const step = span / 30;
  const candidates: Point[] = [];
  for (let x = x0; x <= x1; x += step) for (let y = y0; y <= y1; y += step) candidates.push([x, y]);
  candidates.sort((a, b) => Math.hypot(a[0] - cx, (a[1] - cy) * 1.4) - Math.hypot(b[0] - cx, (b[1] - cy) * 1.4));

  const fits = (c: Point, s: number) => {
    const h = s / 2;
    return [
      [c[0] - h, c[1] - h],
      [c[0] + h, c[1] - h],
      [c[0] - h, c[1] + h],
      [c[0] + h, c[1] + h],
    ].every((p) => inside(p as Point, poly));
  };

  // Start near the size that can fit: the objects' total area at most about half of the area's.
  let area = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) area += (poly[j][0] + poly[i][0]) * (poly[j][1] - poly[i][1]);
  area = Math.abs(area) / 2;
  const need = objects.reduce((sum, o) => sum + (span * Math.max(0.17, 0.5 * Math.sqrt(o.share))) ** 2, 0);
  const start = Math.min(1, Math.sqrt((0.5 * area) / need));

  for (let scale = start; scale > 0.2; scale *= 0.94) {
    const placed: Placed[] = [];
    let ok = true;
    for (const o of objects) {
      const size = span * scale * Math.max(0.17, 0.5 * Math.sqrt(o.share));
      const gap = span * 0.02;
      const spot = candidates.find(
        (c) =>
          fits(c, size) &&
          placed.every((p) => Math.abs(p.x - c[0]) >= (p.size + size) / 2 + gap || Math.abs(p.y - c[1]) >= (p.size + size) / 2 + gap),
      );
      if (!spot) {
        ok = false;
        break;
      }
      placed.push({ id: o.id, x: spot[0], y: spot[1], size });
    }
    if (ok) return placed.map((p) => ({ ...p, y: p.y * aspect }));
  }
  throw new Error("packing: the objects do not fit");
}
