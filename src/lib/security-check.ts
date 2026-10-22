/*
 * The Security check's results, for the browser: every bag is looked up in the precomputed grid
 * (public/security-check/grid/<model version>/, see security-check-grid.ts). There is no live server.
 * The six passengers' results are in the content (securityCheck.scanner.presets).
 */
import { securityCheck } from "@/content/security-check";
import grid from "@/content/security-check-grid.json";
import { createGridLookup, type GridHeader } from "./security-check-grid";

export const gridHeader = grid as GridHeader;

const lines = Object.fromEntries(securityCheck.scanner.objects.map((o) => [o.id, { raised: o.raised, lowered: o.lowered }]));

let lookup: ReturnType<typeof createGridLookup> | null = null;

/** The grid lookup for this visit (created on first use, in the browser). */
export function securityCheckGrid() {
  lookup ??= createGridLookup(gridHeader, lines, (url) => fetch(url));
  return lookup;
}

export { amountStep, hourBand } from "./security-check-grid";
