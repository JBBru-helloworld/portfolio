/**
 * The split-flap board's fixed flap order: a blank, A to Z, 0 to 9, then punctuation. Every flap cycles
 * through this order (wrapping round) until it reaches its target. `pnpm check:content` fails if the
 * board content uses a character that is not here. Keep it a single double-quoted string literal (the
 * check reads it from this file).
 */
export const FLAP_SEQUENCE = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,:+-/'·";

const index = new Map([...FLAP_SEQUENCE].map((c, i) => [c, i]));

/** Position of a character in the sequence (unknown characters fall back to the blank). */
export function flapIndex(char: string): number {
  return index.get(char) ?? 0;
}
