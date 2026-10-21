/*
 * The seat map's geometry, derived from the stack's order (src/content/stack.ts). Nothing here is stored:
 * seat numbers and positions come from the zone order every time.
 *
 * Rows are numbered from the nose (1, 2, ...); each row has six seats, A B C, the aisle, D E F; each zone
 * starts a new row, so its last row may be partly empty. Positions are in layout units, shared by both
 * drawings: "along" runs from the nose to the tail, "across" from seat A's side to seat F's side.
 *
 *   wide screens:  the plane lies horizontally, nose on the left: x = along, y = across (A at the top);
 *   phones:        the plane stands vertically, nose at the top:   x = across (A on the left), y = along.
 */
import type { StackElement, Zone } from "@/content";

export const SEAT = 44; // a seat's size
export const LETTERS = ["A", "B", "C", "D", "E", "F"] as const;
export type Letter = (typeof LETTERS)[number];
/** Across offsets of seats A to F inside the cabin (the aisle between C and D). */
const ACROSS: Record<Letter, number> = { A: 0, B: 48, C: 96, D: 162, E: 210, F: 258 };
const CABIN_ACROSS = ACROSS.F + SEAT; // 302
export const WALL = 16; // between the fuselage skin and the window seats
export const FUSELAGE = CABIN_ACROSS + 2 * WALL; // 334, the fuselage's width
/** Room outside the fuselage for the wings: generous lying down, a small stub standing up. */
export const WING = { wide: 130, tall: 12 } as const;

const PITCH = 54; // row to row
const ROW_GAP = PITCH - SEAT;
export const NOSE = 172; // a pointed nose
const FORWARD = 30; // the forward galley and lavatory
const BAND = 40; // before each zone: its label (and, between zones, the exit row)
const AFT = 34; // the aft galley and lavatory
export const TAIL = 215; // a long tail cone

export interface SeatSpot {
  /** The technology's id (its anchor is #seat-<id>). */
  id: string;
  symbol: string;
  name: string;
  zone: Zone;
  row: number;
  letter: Letter;
  /** "3A" */
  code: string;
  /** Position of the seat's corner nearest the nose and seat A's side. */
  along: number;
  across: number;
  /** Index in the cabin's reading order (row by row, A to F). */
  index: number;
}

export interface EmptySpot {
  row: number;
  letter: Letter;
  along: number;
  across: number;
}

export interface Band {
  zone: Zone;
  /** The band's start and end along the cabin. */
  from: number;
  to: number;
  /** True for the bands between zones (an exit row). */
  exit: boolean;
}

export interface Layout {
  seats: SeatSpot[];
  empties: EmptySpot[];
  bands: Band[];
  /** Rows from the nose: the along position of each row (index 0 is row 1). */
  rows: number[];
  /** Along positions of the galleys, and the cabin's ends. */
  forwardGalley: number;
  aftGalley: number;
  cabinStart: number;
  cabinEnd: number;
  /** The whole drawing, nose to tail. */
  length: number;
}

export function buildLayout(stack: Pick<StackElement, "id" | "symbol" | "name" | "zone">[], zones: Zone[]): Layout {
  const seats: SeatSpot[] = [];
  const empties: EmptySpot[] = [];
  const bands: Band[] = [];
  const rows: number[] = [];
  const cabinStart = NOSE;
  let cursor = NOSE + FORWARD;
  let row = 0;
  zones.forEach((zone, z) => {
    const members = stack.filter((e) => e.zone === zone.name);
    bands.push({ zone, from: cursor, to: cursor + BAND, exit: z > 0 });
    cursor += BAND;
    for (let i = 0; i < members.length; i += LETTERS.length) {
      row += 1;
      rows.push(cursor);
      LETTERS.forEach((letter, k) => {
        const e = members[i + k];
        const spot = { row, letter, along: cursor, across: WALL + ACROSS[letter] };
        if (e)
          seats.push({ ...spot, id: e.id, symbol: e.symbol, name: e.name, zone, code: `${row}${letter}`, index: seats.length });
        else empties.push(spot);
      });
      cursor += PITCH;
    }
    cursor -= ROW_GAP;
  });
  const aftGalley = cursor;
  const cabinEnd = cursor + AFT;
  return {
    seats,
    empties,
    bands,
    rows,
    forwardGalley: NOSE,
    aftGalley,
    cabinStart,
    cabinEnd,
    length: cabinEnd + TAIL,
  };
}

/** The drawing's size in layout units for each orientation. */
export function drawingSize(layout: Layout) {
  return {
    wide: { w: layout.length, h: FUSELAGE + 2 * WING.wide },
    tall: { w: FUSELAGE + 2 * WING.tall, h: layout.length },
  };
}

/**
 * The seat to move to from `from` with an arrow key, in the physical layout. Along the cabin (towards the
 * nose or tail) it keeps the letter where it can, else the nearest letter in that row; across the cabin it
 * moves to the next seat in the same row. Empty seats are skipped. Returns `from` at the edges.
 */
export function neighbour(seats: SeatSpot[], from: SeatSpot, dir: "fore" | "aft" | "towardsA" | "towardsF"): SeatSpot {
  const col = LETTERS.indexOf(from.letter);
  if (dir === "towardsA" || dir === "towardsF") {
    const step = dir === "towardsA" ? -1 : 1;
    const inRow = seats.filter((s) => s.row === from.row).sort((a, b) => LETTERS.indexOf(a.letter) - LETTERS.indexOf(b.letter));
    const next = step > 0 ? inRow.find((s) => LETTERS.indexOf(s.letter) > col) : [...inRow].reverse().find((s) => LETTERS.indexOf(s.letter) < col);
    return next ?? from;
  }
  const step = dir === "fore" ? -1 : 1;
  const maxRow = Math.max(...seats.map((s) => s.row));
  for (let r = from.row + step; r >= 1 && r <= maxRow; r += step) {
    const inRow = seats.filter((s) => s.row === r);
    if (!inRow.length) continue;
    // Same letter if it is taken, else the closest one.
    return inRow.reduce((best, s) =>
      Math.abs(LETTERS.indexOf(s.letter) - col) < Math.abs(LETTERS.indexOf(best.letter) - col) ? s : best,
    );
  }
  return from;
}
