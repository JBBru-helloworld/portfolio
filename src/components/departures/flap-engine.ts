/*
 * Split-flap engine: one requestAnimationFrame loop drives every tile. Each tile cycles through the fixed
 * flap sequence, one flip at a time, until it reaches its target. Only tiles that are flipping are touched,
 * and only through transforms (plus swapping a glyph's text when a flip begins or ends); nothing measures
 * layout while flipping.
 *
 * Tile DOM (rendered by DeparturesBoard): four halves, each holding one glyph (in `data-glyph`, drawn by CSS).
 *   top        static, upper half of the NEXT character during a flip
 *   bottom     static, lower half of the CURRENT character
 *   flapTop    upper half of the CURRENT character, folds down about the hinge, 0 -> 90deg (ease-in)
 *   flapBottom lower half of the NEXT character, falls from 90 -> 0deg into place
 *
 * The fold is drawn as its projection, scaleY(cos angle) from the hinge, rather than a 3D rotateX: at
 * tile size the two look the same, but every 3D-transformed element becomes its own compositor layer
 * (about 700 flaps here), which dropped the board to about 22 fps. 2D transforms stay on the main paint
 * path, and each tile is isolated with `contain: paint`, so only the moving tiles repaint.
 */
import { FLAP_SEQUENCE, flapIndex } from "@/lib/flap-sequence";

export const FLIP_MS = 70;
const N = FLAP_SEQUENCE.length;

interface Tile {
  top: HTMLElement;
  bottom: HTMLElement;
  flapTop: HTMLElement;
  flapBottom: HTMLElement;
  glyphs: [HTMLElement, HTMLElement, HTMLElement, HTMLElement];
  /** Sequence index the tile starts from, and how many flips it makes to reach its target. */
  start: number;
  steps: number;
  target: number;
  startAt: number;
  /** The flip currently shown (-1 before the first). */
  k: number;
  phase2: boolean;
  /** The character actually showing when a retarget began (its first flip folds this one away). */
  from?: string;
}

export interface BoardOptions {
  /** ms between rows starting, top to bottom. */
  rowStagger: number;
  /** Extra random delay per tile, 0..tileJitter ms. */
  tileJitter: number;
  /** Each tile starts this many steps (random, inclusive) before its target. */
  stepsBefore: [number, number];
  /** Called once per completed flip (for the optional sound). */
  onFlip?: () => void;
  /** Called once every tile has settled, with the time the whole board took (ms). */
  onDone?: (ms: number) => void;
}

const easeIn = (t: number) => t * t * t;
const easeOut = (t: number) => 1 - (1 - t) ** 3;
/** The fold's projection: a flap turned `deg` about its hinge is cos(deg) of its height. */
const fold = (deg: number) => `scaleY(${Math.cos((deg * Math.PI) / 180).toFixed(4)})`;
const IDLE_TOP = "";
const HIDDEN_BOTTOM = "scaleY(0)";

function glyphsOf(tile: HTMLElement) {
  const q = (part: string) => tile.querySelector<HTMLElement>(`[data-part="${part}"]`)!;
  const top = q("top");
  const bottom = q("bottom");
  const flapTop = q("flap-top");
  const flapBottom = q("flap-bottom");
  const g = (el: HTMLElement) => el.firstElementChild as HTMLElement;
  return { top, bottom, flapTop, flapBottom, glyphs: [g(top), g(bottom), g(flapTop), g(flapBottom)] as Tile["glyphs"] };
}

// The glyph is an attribute drawn by CSS (`.glyph::before`), not text: assistive tech and audits never read
// a tile's four halves as four letters (the tiles are aria-hidden; each row has its own name).
const set = (el: HTMLElement, c: string) => {
  if (el.dataset.glyph !== c) el.dataset.glyph = c;
};

export class FlapBoard {
  private tiles: Tile[] = [];
  private active: Tile[] = [];
  private raf = 0;
  private t0 = 0;

  /**
   * @param rows Tiles grouped by board row (top to bottom). Each tile element carries data-target (its
   *             final character); tiles without one stay as they are.
   */
  constructor(
    private readonly rows: HTMLElement[][],
    private readonly opts: BoardOptions,
  ) {}

  /**
   * Puts every tile on its starting character (a few steps before its target), ready to run. Tiles whose
   * target is blank start blank and never move.
   */
  prepare(random: () => number = Math.random): void {
    const [lo, hi] = this.opts.stepsBefore;
    this.tiles = [];
    this.rows.forEach((row, r) => {
      for (const el of row) {
        const target = flapIndex(el.dataset.target ?? " ");
        const steps = target === 0 ? 0 : lo + Math.floor(random() * (hi - lo + 1));
        const cur = (target - steps + N * 4) % N;
        const parts = glyphsOf(el);
        const c = FLAP_SEQUENCE[cur];
        parts.glyphs.forEach((g) => set(g, c));
        parts.flapTop.style.transform = IDLE_TOP;
        parts.flapBottom.style.transform = HIDDEN_BOTTOM;
        this.tiles.push({
          ...parts,
          start: cur,
          steps,
          target,
          startAt: r * this.opts.rowStagger + random() * this.opts.tileJitter,
          k: -1,
          phase2: false,
        });
      }
    });
  }

  /**
   * Flips tiles from whatever they show now to new characters (a remark changing). Each tile makes a few
   * flips, the first folding away its current character; tiles already right, or blank to blank, stay
   * still. Call run() afterwards.
   */
  retarget(text: string, random: () => number = Math.random): void {
    const [lo, hi] = this.opts.stepsBefore;
    const els = this.rows.flat();
    this.tiles = [];
    els.forEach((el, i) => {
      const c = text[i] ?? " ";
      el.dataset.target = c;
      const parts = glyphsOf(el);
      const from = parts.glyphs[1].dataset.glyph || " ";
      const target = flapIndex(c);
      const steps = from === c ? 0 : lo + Math.floor(random() * (hi - lo + 1));
      if (!steps) return;
      this.tiles.push({
        ...parts,
        start: (target - steps + N * 4) % N,
        steps,
        target,
        startAt: random() * this.opts.tileJitter,
        k: -1,
        phase2: false,
        from,
      });
    });
  }

  /** Shows every tile on its target at once (reduced motion, or after cleanup). */
  settle(): void {
    for (const row of this.rows) {
      for (const el of row) {
        const parts = glyphsOf(el);
        const c = el.dataset.target ?? " ";
        parts.glyphs.forEach((g) => set(g, c));
        parts.flapTop.style.transform = "";
        parts.flapBottom.style.transform = "";
      }
    }
  }

  run(): void {
    this.active = this.tiles.filter((t) => t.steps > 0);
    this.t0 = performance.now();
    const frame = (now: number) => {
      const t = now - this.t0;
      let i = 0;
      while (i < this.active.length) {
        const tile = this.active[i];
        if (this.step(tile, t)) {
          this.active[i] = this.active[this.active.length - 1];
          this.active.pop();
        } else i++;
      }
      if (this.active.length) this.raf = requestAnimationFrame(frame);
      else {
        this.raf = 0;
        this.opts.onDone?.(now - this.t0);
      }
    };
    this.raf = requestAnimationFrame(frame);
  }

  /**
   * Places one tile from the elapsed time alone (which flip it is on, and how far through it), so the
   * board settles on schedule at any frame rate; slow frames skip ahead rather than slowing it down.
   * Returns true once the tile has reached its target.
   */
  private step(tile: Tile, t: number): boolean {
    const elapsed = t - tile.startAt;
    if (elapsed < 0) return false;
    const k = Math.floor(elapsed / FLIP_MS);
    if (k >= tile.steps) {
      const c = FLAP_SEQUENCE[tile.target];
      tile.glyphs.forEach((g) => set(g, c));
      tile.flapTop.style.transform = IDLE_TOP;
      tile.flapBottom.style.transform = HIDDEN_BOTTOM;
      if (k !== tile.k) this.opts.onFlip?.();
      return true;
    }
    if (k !== tile.k) {
      // A new flip begins: current character on the folding top flap and the static bottom, the next one
      // behind the top flap and on the falling bottom flap.
      const cur = k === 0 && tile.from !== undefined ? tile.from : FLAP_SEQUENCE[(tile.start + k) % N];
      const next = FLAP_SEQUENCE[(tile.start + k + 1) % N];
      set(tile.glyphs[0], next);
      set(tile.glyphs[1], cur);
      set(tile.glyphs[2], cur);
      set(tile.glyphs[3], next);
      tile.flapBottom.style.transform = HIDDEN_BOTTOM;
      if (tile.k >= 0) this.opts.onFlip?.();
      tile.k = k;
      tile.phase2 = false;
    }
    const f = (elapsed - k * FLIP_MS) / FLIP_MS;
    if (f < 0.5) {
      tile.flapTop.style.transform = fold(90 * easeIn(f * 2));
      return false;
    }
    if (!tile.phase2) {
      tile.phase2 = true;
      tile.flapTop.style.transform = HIDDEN_BOTTOM;
    }
    tile.flapBottom.style.transform = fold(90 * (1 - easeOut((f - 0.5) * 2)));
    return false;
  }

  get running(): boolean {
    return this.raf !== 0;
  }

  stop(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }
}
