/*
 * The Security check's words and numbers: the luggage tag's fields, amounts in US dollars (the dataset's
 * currency), the time bands (the dataset's own clock, never a local time), the percentile and the score.
 */
import type { GridHeader, GridResult } from "@/lib/security-check-grid";

export type BagId = "tan-suitcase" | "doctors-bag" | "brown-case";
export const BAG_IDS: BagId[] = ["tan-suitcase", "doctors-bag", "brown-case"];

/** A bag's inputs: the amount and hour (exact for passengers, a grid step for packed bags) and the choices. */
export interface BagInputs {
  amount: number;
  hour: number;
  choices: Record<string, string>;
}

/** "$4.99", "$250", "$1,450". */
export function dollars(amount: number): string {
  const whole = Number.isInteger(amount);
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 })}`;
}

/** "TIME BAND A" to "TIME BAND F": the dataset's clock is not a local time, so no clock times are shown. */
export function timeBand(index: number): string {
  return `TIME BAND ${String.fromCharCode(65 + index)}`;
}

const NETWORK: Record<string, string> = { visa: "VISA", mastercard: "MASTERCARD", "american express": "AMEX", discover: "DISCOVER" };
const DISTANCE: Record<string, string> = { short: "SHORT", long: "LONG", unknown: "UNKNOWN" };

export interface TagField {
  label: string;
  value: string;
}

/** The tag's typed fields, in print order. */
export function tagFields(header: GridHeader, name: string, inputs: BagInputs, band: number): TagField[] {
  const c = inputs.choices;
  return [
    { label: "Passenger", value: name.toUpperCase() },
    { label: "From → to", value: DISTANCE[c.distance] ?? c.distance.toUpperCase() },
    { label: "Value", value: dollars(inputs.amount) },
    { label: "Class", value: `${NETWORK[c.network] ?? c.network.toUpperCase()} · ${c.card_type.toUpperCase()}` },
    { label: "Time", value: timeBand(band) },
    { label: "Device", value: c.device.toUpperCase() },
    { label: "Email", value: c.email.toUpperCase() },
    // The dataset's product codes are anonymised: shown as "TYPE C", never given a meaning.
    { label: "Product", value: `TYPE ${c.product}` },
  ];
}

/** "97%": the share of validation transactions with a lower score, rounded. */
export function riskier(percentile: number): string {
  return `${Math.round(percentile)}%`;
}

/** A share as a whole percentage ("33%"); anything above zero shows at least "<1%". */
export function sharePercent(share: number): string {
  const p = Math.round(share * 100);
  return p === 0 && share > 0 ? "<1%" : `${p}%`;
}

/** The raw score in scientific form, for technical visitors: ["3.428", "-3"] for 3.428 × 10⁻³. */
export function scoreParts(score: number): [string, string] {
  const [mantissa, exponent] = score.toExponential(3).split("e");
  return [mantissa, String(Number(exponent))];
}

/** A plain-English line as part of a sentence: "the card and its usual spending raised the risk". */
function clause(line: string): string {
  return line.charAt(0).toLowerCase() + line.slice(1).replace(/\.$/, "");
}

/** The polite announcement after a scan. */
export function announcement(result: GridResult): string {
  const reasons = result.objects.slice(0, 2).map((o) => clause(o.line));
  return `Verdict: ${result.verdict}. Riskier than ${riskier(result.percentile)} of transactions. Main reasons: ${reasons.join("; ")}.`;
}

/** Invented, neutral names for random passengers. */
export const RANDOM_NAMES = [
  "A. Rivers",
  "J. Hale",
  "M. Okoro",
  "S. Lind",
  "T. Varga",
  "R. Costa",
  "E. Moreau",
  "K. Imani",
  "L. Brandt",
  "D. Quinn",
  "N. Sato",
  "P. Aldana",
];
