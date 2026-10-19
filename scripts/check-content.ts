/*
 * Content checks for src/content/. Run with `pnpm check:content` (Node 24 runs TypeScript directly).
 *
 * Fails on: excluded words and phrases, em dashes, common US spellings in strings,
 * duplicate or malformed periodic-table symbols, and departures-board rows that do not fit.
 * Warns (does not fail) on every TODO(owner) and CHECK(owner) until launch.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const contentDir = join(root, "src", "content");

const EXCLUDED: { label: string; pattern: RegExp }[] = [
  { label: "Singapore", pattern: /singapore/i },
  { label: "Sunway Tech Club", pattern: /sunway\s+tech\s+club/i },
  { label: "job hunt", pattern: /job[\s-]*hunt/i },
  { label: "looking for work", pattern: /looking\s+for\s+work/i },
  { label: "open to work", pattern: /open\s+to\s+work/i },
  { label: "hiring", pattern: /\bhiring\b/i },
  { label: "available for", pattern: /available\s+for/i },
  { label: "internship opportunities", pattern: /internship\s+opportunit/i },
];

// US spellings checked inside string literals only, so code identifiers are not affected.
const US_SPELLINGS: { us: RegExp; uk: string }[] = [
  { us: /\bcolou?r(s|ed|ful|ing)?\b/i, uk: "colour" },
  { us: /\bcenter(s|ed|ing)?\b/i, uk: "centre" },
  { us: /\borganiz\w*/i, uk: "organis..." },
  { us: /\boptimiz\w*/i, uk: "optimis..." },
  { us: /\bbehavior\w*/i, uk: "behaviour" },
  { us: /\banalyz\w*/i, uk: "analys..." },
  { us: /\bfavorite\w*/i, uk: "favourite" },
  { us: /\bcatalog\b/i, uk: "catalogue" },
  { us: /\bgray\b/i, uk: "grey" },
  { us: /\bmodeling\b/i, uk: "modelling" },
  { us: /\blabeled\b/i, uk: "labelled" },
  { us: /\bcanceled\b/i, uk: "cancelled" },
  { us: /\btraveling\b/i, uk: "travelling" },
  { us: /\brecognize\w*/i, uk: "recognis..." },
  { us: /\bprioritiz\w*/i, uk: "prioritis..." },
  { us: /\bcustomiz\w*/i, uk: "customis..." },
  { us: /\bsummariz\w*/i, uk: "summaris..." },
  { us: /\bvisualiz\w*/i, uk: "visualis..." },
];
// "colour" itself matches the colou?r pattern above; only the US form is reported.
const isUsColour = (word: string) => /^color/i.test(word);

const failures: string[] = [];
const warnings: string[] = [];

function lineOf(text: string, index: number): number {
  return text.slice(0, index).split("\n").length;
}

/** String literal contents with their offsets ("...", '...', `...`). */
function stringLiterals(text: string): { value: string; index: number }[] {
  const out: { value: string; index: number }[] = [];
  const re = /"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    // Skip apostrophes inside double-quoted strings already consumed; skip comments roughly.
    const before = text.slice(text.lastIndexOf("\n", m.index) + 1, m.index);
    if (before.includes("//")) continue;
    out.push({ value: m[1] ?? m[2] ?? m[3] ?? "", index: m.index });
  }
  return out;
}

const files = readdirSync(contentDir).filter((f) => f.endsWith(".ts"));

for (const file of files) {
  const path = join(contentDir, file);
  const rel = relative(root, path);
  const text = readFileSync(path, "utf8");

  for (const { label, pattern } of EXCLUDED) {
    const re = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) failures.push(`${rel}:${lineOf(text, m.index)}  excluded phrase "${label}"`);
  }

  for (let i = text.indexOf("—"); i !== -1; i = text.indexOf("—", i + 1)) {
    failures.push(`${rel}:${lineOf(text, i)}  em dash`);
  }

  for (const { value, index } of stringLiterals(text)) {
    for (const { us, uk } of US_SPELLINGS) {
      const m = value.match(us);
      if (!m) continue;
      if (uk === "colour" && !isUsColour(m[0])) continue;
      failures.push(`${rel}:${lineOf(text, index)}  US spelling "${m[0]}" (use ${uk})`);
    }
  }

  // Owner markers count only inside string literals (doc comments may mention the convention).
  for (const { value, index } of stringLiterals(text)) {
    const at = value.search(/(TODO|CHECK)\(owner\)/);
    if (at !== -1) warnings.push(`${rel}:${lineOf(text, index)}  ${value.slice(at).trim()}`);
  }
}

// Periodic table: symbols unique, 1 to 3 letters, first capitalised.
{
  const rel = "src/content/stack.ts";
  const text = readFileSync(join(contentDir, "stack.ts"), "utf8");
  const seen = new Map<string, number>();
  const re = /symbol:\s*"([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const symbol = m[1];
    const line = lineOf(text, m.index);
    if (!/^[A-Z][a-z]{0,2}$/.test(symbol)) failures.push(`${rel}:${line}  symbol "${symbol}" is not 1 to 3 letters, first capitalised`);
    if (seen.has(symbol)) failures.push(`${rel}:${line}  duplicate symbol "${symbol}" (first on line ${seen.get(symbol)})`);
    else seen.set(symbol, line);
  }
}

// Departures board: codes 2 to 4 characters, destinations and the board role at most 32 characters.
{
  const rel = "src/content/departures.ts";
  const text = readFileSync(join(contentDir, "departures.ts"), "utf8");
  for (const m of text.matchAll(/code:\s*"([^"]*)"/g)) {
    if (m[1].length < 2 || m[1].length > 4) failures.push(`${rel}:${lineOf(text, m.index ?? 0)}  code "${m[1]}" must be 2 to 4 characters`);
  }
  for (const m of text.matchAll(/destination:\s*"([^"]*)"/g)) {
    if (m[1].length > 32) failures.push(`${rel}:${lineOf(text, m.index ?? 0)}  destination "${m[1]}" is ${m[1].length} characters (max 32)`);
  }
  const profile = readFileSync(join(contentDir, "profile.ts"), "utf8");
  const board = profile.match(/board:\s*"([^"]*)"/);
  if (board && board[1].length > 32) failures.push(`src/content/profile.ts  board role line is ${board[1].length} characters (max 32)`);
}

if (warnings.length) {
  console.log(`\nOpen owner items (${warnings.length}, warnings until launch):`);
  for (const w of warnings) console.log(`  ! ${w}`);
}

if (failures.length) {
  console.error(`\ncheck:content FAILED with ${failures.length} problem(s):`);
  for (const f of failures) console.error(`  x ${f}`);
  process.exit(1);
}

console.log(`\ncheck:content passed: ${files.length} files in src/content, no excluded phrases, em dashes or US spellings.`);
