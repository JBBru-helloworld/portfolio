/*
 * The camera push's end state: how far to move and scale the stage so the visible view covers the viewport.
 *
 * The stage scales about the glass centre (its CSS transform-origin). A screen point p maps to
 *   p' = O + t + s (p - O)
 * for origin O, translation t and scale s. We pick a centre C inside the view and the smallest s for which
 * the viewport, mapped back into stage space (a rectangle centred on C, viewport / s in size), lies inside
 * the view outline; t then brings C to the viewport's centre.
 */

export interface Point {
  x: number;
  y: number;
}

export interface PushTarget {
  x: number;
  y: number;
  scale: number;
}

function inside(px: number, py: number, poly: Point[]): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > py !== b.y > py && px < ((b.x - a.x) * (py - a.y)) / (b.y - a.y) + a.x) hit = !hit;
  }
  return hit;
}

/** Whether a rectangle (centre, half sizes) lies inside the polygon, sampled along its edges. */
function rectInside(cx: number, cy: number, hw: number, hh: number, poly: Point[], samples = 24): boolean {
  for (let i = 0; i <= samples; i++) {
    const f = i / samples;
    const x = cx - hw + 2 * hw * f;
    const y = cy - hh + 2 * hh * f;
    if (
      !inside(x, cy - hh, poly) ||
      !inside(x, cy + hh, poly) ||
      !inside(cx - hw, y, poly) ||
      !inside(cx + hw, y, poly)
    ) {
      return false;
    }
  }
  return true;
}

/** Smallest scale at which a vw x vh viewport, centred on c, fits inside the view outline. */
function fitScale(c: Point, vw: number, vh: number, poly: Point[]): number {
  if (!inside(c.x, c.y, poly)) return Infinity;
  let lo = 0.01;
  let hi = 1000;
  if (!rectInside(c.x, c.y, vw / 2 / hi, vh / 2 / hi, poly)) return Infinity;
  for (let k = 0; k < 28; k++) {
    const mid = Math.sqrt(lo * hi);
    if (rectInside(c.x, c.y, vw / 2 / mid, vh / 2 / mid, poly)) hi = mid;
    else lo = mid;
  }
  return hi;
}

/**
 * @param view   The visible view outline in screen pixels (untransformed stage).
 * @param origin The stage's transform-origin (glass centre) in screen pixels.
 * @param vw     Viewport width.
 * @param vh     Viewport height.
 * @param margin Extra scale beyond the exact fit (0.04 = 4%).
 */
export function pushTarget(view: Point[], origin: Point, vw: number, vh: number, margin: number): PushTarget {
  const xs = view.map((p) => p.x);
  const ys = view.map((p) => p.y);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  // Try centres around the outline's middle and keep the one that needs the least magnification.
  let best = { c: { x: (x0 + x1) / 2, y: (y0 + y1) / 2 }, s: Infinity };
  for (const fx of [0.44, 0.5, 0.56]) {
    for (const fy of [0.42, 0.48, 0.54, 0.6]) {
      const c = { x: x0 + (x1 - x0) * fx, y: y0 + (y1 - y0) * fy };
      const s = fitScale(c, vw, vh, view);
      if (s < best.s) best = { c, s };
    }
  }
  const scale = best.s * (1 + margin);
  return {
    scale,
    x: vw / 2 - origin.x - scale * (best.c.x - origin.x),
    y: vh / 2 - origin.y - scale * (best.c.y - origin.y),
  };
}
