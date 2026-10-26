/*
 * Looking up a packed bag in the precomputed grid (payments-fraud-detection, `make scanner-grid`).
 *
 * The grid holds every bag a visitor can pack: each amount step, each four-hour band and every value of
 * the choice inputs, scored in advance by the fraud model with exact explanations. The results are split
 * into one chunk per amount step and hour band; a lookup downloads only its own chunk, once per visit
 * (kept in memory), and returns the same shape the scanner API returned.
 *
 * Pure (no imports from the app), so scripts can test it against the files on disk or a preview server.
 */

export type GridVerdict = "CLEARED" | "SCREENING" | "STOPPED";

export interface GridHeader {
  format: number;
  modelVersion: string;
  amount: number[];
  hour: { from: number; to: number; hour: number }[];
  choices: { id: string; values: string[] }[];
  objects: string[];
  verdicts: GridVerdict[];
  bands: Record<"screening" | "stopped", { score: number; percentile: number }>;
  chunks: string[];
  /** Cells of each verdict in each chunk (same order as chunks and verdicts). */
  counts: number[][];
  /** Where the chunks are served, ending in a slash ("/security-check/grid/<model version>/"). */
  path: string;
}

/** A bag on the grid: the step indices for the amount and hour, and a value for each choice input. */
export interface GridBag {
  amountStep: number;
  hourBand: number;
  choices: Record<string, string>;
}

export interface GridResult {
  verdict: GridVerdict;
  /** Share of the validation window's transactions with a lower score, in percent. */
  percentile: number;
  /** The model's raw score (not a probability), to four significant digits. */
  score: number;
  objects: { id: string; share: number; direction: "raised" | "lowered"; line: string }[];
}

type Lines = Record<string, { raised: string; lowered: string }>;
type Fetcher = (url: string) => Promise<{ ok: boolean; json(): Promise<unknown> }>;
type Chunk = { modelVersion: string; records: (number)[][] };

/** The index of the amount step nearest to an amount (on a log scale, as the steps are). */
export function amountStep(header: GridHeader, amount: number): number {
  let best = 0;
  header.amount.forEach((step, i) => {
    if (Math.abs(Math.log(amount / step)) < Math.abs(Math.log(amount / header.amount[best]))) best = i;
  });
  return best;
}

/** The index of the hour band containing an hour (0 to 23). */
export function hourBand(header: GridHeader, hour: number): number {
  const i = header.hour.findIndex((b) => hour >= b.from && hour <= b.to);
  if (i < 0) throw new RangeError(`hour ${hour} is outside the grid`);
  return i;
}

/** The chunk file for an amount step and hour band. */
export function chunkName(amountStep: number, hourBand: number): string {
  return `a-${amountStep}-h-${hourBand}.json`;
}

/** The record's position in its chunk: the choice inputs in header order, the last varying fastest. */
export function recordIndex(header: GridHeader, choices: Record<string, string>): number {
  let index = 0;
  for (const { id, values } of header.choices) {
    const v = values.indexOf(choices[id]);
    if (v < 0) throw new RangeError(`${id} has no stored value "${choices[id]}"`);
    index = index * values.length + v;
  }
  return index;
}

/** The choice values at a record's position (the inverse of recordIndex). */
export function choicesAt(header: GridHeader, index: number): Record<string, string> {
  const choices: Record<string, string> = {};
  for (let i = header.choices.length - 1; i >= 0; i--) {
    const { id, values } = header.choices[i];
    choices[id] = values[index % values.length];
    index = Math.floor(index / values.length);
  }
  return choices;
}

/** The amount step and hour band of a chunk, from its name ("a-<i>-h-<j>.json"). */
export function chunkCell(name: string): { amountStep: number; hourBand: number } {
  const m = /^a-(\d+)-h-(\d+)\.json$/.exec(name);
  if (!m) throw new RangeError(`not a grid chunk: ${name}`);
  return { amountStep: Number(m[1]), hourBand: Number(m[2]) };
}

/**
 * A random draw for the "random passenger": the verdict first (each equally likely, as most of the grid is
 * CLEARED), then a chunk weighted by how many cells of that verdict it holds. The cell itself is chosen once
 * the chunk is loaded (see lookup.random), so a draw downloads at most one chunk.
 */
export function drawChunk(header: GridHeader, rand: () => number): { verdict: number; chunk: string } {
  const verdict = Math.min(header.verdicts.length - 1, Math.floor(rand() * header.verdicts.length));
  const total = header.counts.reduce((sum, c) => sum + c[verdict], 0);
  let r = rand() * total;
  for (let i = 0; i < header.chunks.length; i++) {
    r -= header.counts[i][verdict];
    if (r < 0) return { verdict, chunk: header.chunks[i] };
  }
  return { verdict, chunk: header.chunks[header.chunks.length - 1] };
}

/** A stored record as a result, the objects sorted by share, largest first. */
export function decodeRecord(header: GridHeader, lines: Lines, record: number[]): GridResult {
  const [verdict, percentile, score, ...shares] = record;
  const objects = header.objects
    .map((id, i) => {
      const direction: "raised" | "lowered" = shares[i] > 0 ? "raised" : "lowered";
      return { id, share: Math.abs(shares[i]) / 1000, direction, line: lines[id][direction] };
    })
    .sort((a, b) => b.share - a.share);
  return { verdict: header.verdicts[verdict], percentile: percentile / 10, score, objects };
}

/** A lookup for one visit: chunks are fetched on first use and kept in memory. */
export function createGridLookup(header: GridHeader, lines: Lines, fetcher: Fetcher, base = "") {
  const chunks = new Map<string, Promise<Chunk>>();

  function load(name: string): Promise<Chunk> {
    let chunk = chunks.get(name);
    if (!chunk) {
      chunk = fetcher(`${base}${header.path}${name}`).then(async (res) => {
        if (!res.ok) throw new Error("grid chunk unavailable");
        const data = (await res.json()) as Chunk;
        if (data.modelVersion !== header.modelVersion) throw new Error("grid chunk from another model");
        return data;
      });
      // A failed download is not cached, so a later try fetches again.
      chunk.catch(() => chunks.delete(name));
      chunks.set(name, chunk);
    }
    return chunk;
  }

  return {
    /** Start downloading a bag's chunk before it is needed (e.g. when a passenger is picked). */
    prefetch(amountStep: number, hourBand: number): void {
      load(chunkName(amountStep, hourBand)).catch(() => undefined);
    },
    /** The stored result for a bag on the grid. */
    async lookup(bag: GridBag): Promise<GridResult> {
      const chunk = await load(chunkName(bag.amountStep, bag.hourBand));
      return decodeRecord(header, lines, chunk.records[recordIndex(header, bag.choices)]);
    },
    /** Starts loading a drawn chunk (see drawChunk) before the visitor presses. */
    prefetchChunk(name: string): void {
      load(name).catch(() => undefined);
    },
    /** A random cell with the drawn verdict, from the drawn chunk, and its stored result. */
    async random(draw: { verdict: number; chunk: string }, rand: () => number): Promise<{ bag: GridBag; result: GridResult }> {
      const chunk = await load(draw.chunk);
      const matching: number[] = [];
      chunk.records.forEach((r, i) => r[0] === draw.verdict && matching.push(i));
      const index = matching.length ? matching[Math.floor(rand() * matching.length)] : Math.floor(rand() * chunk.records.length);
      const bag = { ...chunkCell(draw.chunk), choices: choicesAt(header, index) };
      return { bag, result: decodeRecord(header, lines, chunk.records[index]) };
    },
  };
}
