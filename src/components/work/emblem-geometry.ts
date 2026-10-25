/*
 * The tail-fin emblem's geometry (Phase 6: shared by the Emblem component and the share-card builder,
 * scripts/og/build.mjs, so the cards draw exactly the site's emblems). In a 48 x 48 box.
 */
import type { Livery } from "@/content";

// The fin: the leading edge swept back, a short rounded tip, a near-vertical trailing edge.
export const FIN = "M5 44 L23.5 7.5 C24.6 5.4 26 4.5 28.2 4.5 L36.6 4.5 C38.4 4.5 39.5 5.7 39.3 7.5 L36.4 44 Z";

export type LiveryShape =
  | { kind: "path"; d: string; strokeWidth: number }
  | { kind: "rect"; x: number; y: number; width: number; height: number }
  | { kind: "circle"; cx: number; cy: number; r: number };

export const LIVERY_SHAPES: Record<Livery, LiveryShape[]> = {
  stripe: [{ kind: "path", d: "M13 46 L31.5 3", strokeWidth: 4.5 }],
  twin: [
    { kind: "path", d: "M11 46 L29.5 3", strokeWidth: 2.2 },
    { kind: "path", d: "M17 46 L35.5 3", strokeWidth: 2.2 },
  ],
  chevron: [{ kind: "path", d: "M4 25 L24 15 L44 25", strokeWidth: 3.6 }],
  band: [{ kind: "rect", x: 0, y: 11, width: 48, height: 5.5 }],
  dot: [{ kind: "circle", cx: 31, cy: 15, r: 4.6 }],
  arc: [{ kind: "path", d: "M4 30 C14 14 30 10 46 15", strokeWidth: 3 }],
};

/** The letters' position and the base line. */
export const LETTERS = { x: 29, y: 37.5 };
export const BASE = { x1: 1, x2: 47, y: 44.5 };
