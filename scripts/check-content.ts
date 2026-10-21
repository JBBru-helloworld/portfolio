/*
 * Content checks for src/content/. Run with `pnpm check:content` (Node 24 runs TypeScript directly).
 *
 * Fails on: excluded words and phrases, the Sunway Tech Club outside its two approved lines, em dashes, common US spellings in strings,
 * third-person pronouns in strings (the site speaks in the first person),
 * duplicate or malformed periodic-table symbols, departures-board rows that do not fit, destinations
 * whose section is not on the page, and project problems (duplicate slugs or flight codes, unknown stack ids,
 * a featured project without a summary, seat-sign names off the flaps, repeated emblems, image counts that
 * do not match the built media).
 * Warns (does not fail) on every TODO(owner) and CHECK(owner) until launch.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const contentDir = join(root, "src", "content");

const EXCLUDED: { label: string; pattern: RegExp }[] = [
  { label: "Singapore", pattern: /singapore/i },
  { label: "job hunt", pattern: /job[\s-]*hunt/i },
  { label: "looking for work", pattern: /looking\s+for\s+work/i },
  { label: "open to work", pattern: /open\s+to\s+work/i },
  { label: "hiring", pattern: /\bhiring\b/i },
  { label: "available for", pattern: /available\s+for/i },
  { label: "internship opportunities", pattern: /internship\s+opportunit/i },
];

// The owner allows the Sunway Tech Club to be named for these two credentials only (Phase 2a).
const CLUB = /sunway\s+tech\s+club/i;
const CLUB_ALLOWED = [
  "Coordinated a five-week Generative AI Study Jam for 900+ participants with the Sunway Tech Club (2025).",
  "Co-led a portfolio workshop with the Sunway Tech Club, alongside a speaker from Google (2025).",
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

  const literals = stringLiterals(text);
  for (const { value, index } of literals) {
    if (CLUB.test(value) && !(file === "credentials.ts" && CLUB_ALLOWED.includes(value))) {
      failures.push(`${rel}:${lineOf(text, index)}  "Sunway Tech Club" outside the two approved credential lines`);
    }
  }
  for (const m of text.matchAll(/sunway\s+tech\s+club/gi)) {
    const at = m.index ?? 0;
    const inString = literals.some(({ value, index }) => at > index && at <= index + value.length);
    if (!inString) failures.push(`${rel}:${lineOf(text, at)}  "Sunway Tech Club" in a comment or code`);
  }

  for (let i = text.indexOf("\u2014"); i !== -1; i = text.indexOf("\u2014", i + 1)) {
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

  // The site speaks in the first person ("I", "my"): no "he", "his" or "him" in site copy.
  for (const { value, index } of stringLiterals(text)) {
    const m = value.match(/\b(he|his|him|himself)\b/i);
    if (m) failures.push(`${rel}:${lineOf(text, index)}  third person "${m[0]}" (the site speaks in the first person)`);
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

// Departures board and site destinations: every row must fit its flaps, and use only flap characters.
{
  const rel = "src/content/destinations.ts";
  const text = readFileSync(join(contentDir, "destinations.ts"), "utf8");
  const limits: Record<string, number> = { flight: 6, destination: 16, gate: 1, remark: 8 };
  const rows = [...text.matchAll(/\{\s*flight:[^}]*\}/g)];
  if (!rows.length) failures.push(`${rel}  no destinations found`);
  const ids: { id: string; line: number }[] = [];
  for (const row of rows) {
    const line = lineOf(text, row.index ?? 0);
    for (const [key, max] of Object.entries(limits)) {
      const m = row[0].match(new RegExp(`${key}:\\s*"([^"]*)"`));
      if (!m) failures.push(`${rel}:${line}  missing ${key}`);
      else if (m[1].length > max || m[1].length === 0) failures.push(`${rel}:${line}  ${key} "${m[1]}" is ${m[1].length} characters (1 to ${max})`);
    }
    const id = row[0].match(/id:\s*"([^"]*)"/);
    if (id) ids.push({ id: id[1], line });
  }
  const profile = readFileSync(join(contentDir, "profile.ts"), "utf8");
  const board = profile.match(/board:\s*"([^"]*)"/);
  if (board && board[1].length > 32) failures.push(`src/content/profile.ts  board role line is ${board[1].length} characters (max 32)`);

  // Every character on the flaps must exist in the board's flap sequence (src/lib/flap-sequence.ts).
  const seqFile = readFileSync(join(contentDir, "..", "lib", "flap-sequence.ts"), "utf8");
  const seqMatch = seqFile.match(/FLAP_SEQUENCE\s*=\s*"([^"]*)"/);
  if (!seqMatch) failures.push("src/lib/flap-sequence.ts  FLAP_SEQUENCE not found");
  else {
    const sequence = new Set(seqMatch[1]);
    const onFlaps: { where: string; value: string }[] = [];
    const departures = readFileSync(join(contentDir, "departures.ts"), "utf8");
    for (const [file, src, keys] of [
      ["src/content/departures.ts", departures, ["label", "name", "gate", "board", "onWord", "offWord"]],
      [rel, text, ["flight", "destination", "gate", "remark"]],
    ] as const) {
      for (const key of keys) {
        for (const m of src.matchAll(new RegExp(`\\b${key}:\\s*"([^"]*)"`, "g"))) {
          onFlaps.push({ where: `${file}:${lineOf(src, m.index ?? 0)}`, value: m[1] });
        }
      }
    }
    // Live remarks set by the board and the corner navigation.
    for (const value of ["BOARDING", "DEPARTED", "ON TIME"]) onFlaps.push({ where: "live remarks", value });
    if (board) onFlaps.push({ where: "src/content/profile.ts (roleLines.board)", value: board[1] });
    for (const { where, value } of onFlaps) {
      const missing = [...new Set([...value].filter((c) => !sequence.has(c)))];
      if (missing.length) failures.push(`${where}  "${value}" uses characters not on the flaps: ${missing.map((c) => JSON.stringify(c)).join(" ")}`);
    }
  }

  // Every destination must be a section on the page: either a component renders the literal id, or the
  // page renders its sections from the destinations list. Set CHECK_PAGE_URL to also check rendered HTML.
  const seen = new Set<string>();
  const sources: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (/\.tsx$/.test(entry.name)) sources.push(readFileSync(path, "utf8"));
    }
  };
  walk(join(root, "src", "app"));
  walk(join(root, "src", "components"));
  const page = readFileSync(join(root, "src", "app", "page.tsx"), "utf8");
  const fromList = /destinations\.map\(/.test(page) && /<DestinationSection\b/.test(page);
  for (const { id, line } of ids) {
    if (seen.has(id)) failures.push(`${rel}:${line}  duplicate section id "${id}"`);
    seen.add(id);
    const literal = sources.some((src) => src.includes(`id="${id}"`));
    if (!literal && !fromList) failures.push(`${rel}:${line}  section id "${id}" is not on the page`);
  }
  const url = process.env.CHECK_PAGE_URL;
  if (url) {
    const html = await (await fetch(url)).text();
    for (const { id, line } of ids) {
      if (!new RegExp(`<section[^>]*\\bid="${id}"`).test(html)) failures.push(`${rel}:${line}  section id "${id}" is missing from ${url}`);
    }
    console.log(`Checked ${ids.length} destination sections against ${url}.`);
  }
}

// Projects: unique slugs and flight codes, real stack ids, a summary on every featured flight, signs that
// fit the seat sign's flaps, distinct emblems, and screenshots that match the built media.
{
  const rel = "src/content/projects.ts";
  // Loaded by path at run time (Node strips the types); a literal .ts import would not typecheck.
  const load = (file: string) => import(join(contentDir, file));
  const { projects } = await load("projects.ts");
  const { stack } = await load("stack.ts");
  const ids = new Set(stack.map((e: { id: string }) => e.id));
  if (ids.size !== stack.length) failures.push("src/content/stack.ts  two elements share an id");
  const seqFile = readFileSync(join(root, "src", "lib", "flap-sequence.ts"), "utf8");
  const sequence = new Set(seqFile.match(/FLAP_SEQUENCE\s*=\s*"([^"]*)"/)?.[1] ?? "");
  let media: Record<string, { images: unknown[] }> = {};
  try {
    media = JSON.parse(readFileSync(join(contentDir, "project-media.json"), "utf8")).projects;
  } catch {
    failures.push("src/content/project-media.json  missing or unreadable (run pnpm projects:build)");
  }
  const seen = { slug: new Set<string>(), flight: new Set<string>(), emblem: new Set<string>() };
  const liveries = new Set(["stripe", "chevron", "dot", "band", "twin", "arc"]);
  let featured = 0;
  for (const p of projects) {
    const at = `${rel} (${p.slug})`;
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.slug)) failures.push(`${at}  slug is not kebab case`);
    if (seen.slug.has(p.slug)) failures.push(`${at}  duplicate slug`);
    seen.slug.add(p.slug);
    if (!/^JB \d{3}$/.test(p.flight)) failures.push(`${at}  flight code "${p.flight}" is not "JB nnn"`);
    if (seen.flight.has(p.flight)) failures.push(`${at}  duplicate flight code ${p.flight}`);
    seen.flight.add(p.flight);
    if (p.featured) {
      featured++;
      if (!p.summary?.trim() || /(TODO|CHECK)\(owner\)/.test(p.summary)) failures.push(`${at}  featured project without a summary`);
    }
    for (const id of p.stack) if (!ids.has(id)) failures.push(`${at}  stack id "${id}" is not in stack.ts`);
    if (!p.stack.length) failures.push(`${at}  empty stack`);
    if (p.sign.length > 15) failures.push(`${at}  sign "${p.sign}" is ${p.sign.length} characters (max 15)`);
    const missing = [...new Set([...`${p.flight} ${p.sign}`].filter((c) => !sequence.has(c)))];
    if (missing.length) failures.push(`${at}  sign or flight uses characters not on the flaps: ${missing.map((c) => JSON.stringify(c)).join(" ")}`);
    if (!/^[A-Z]{1,2}$/.test(p.emblem.letters)) failures.push(`${at}  emblem letters "${p.emblem.letters}" are not one or two capitals`);
    if (!liveries.has(p.emblem.livery)) failures.push(`${at}  unknown livery "${p.emblem.livery}"`);
    const emblem = `${p.emblem.letters}/${p.emblem.livery}`;
    if (seen.emblem.has(emblem)) failures.push(`${at}  emblem ${emblem} is not unique`);
    seen.emblem.add(emblem);
    const built = media[p.slug]?.images.length ?? 0;
    if (built !== p.images.length) failures.push(`${at}  ${p.images.length} image texts but ${built} built images (pnpm projects:build)`);
  }
  if (featured !== 6) failures.push(`${rel}  ${featured} featured projects (expected 6)`);
  // Featured first, in flight-code order, then All flights.
  const codes = projects.map((p: { flight: string }) => Number(p.flight.slice(3)));
  if (codes.some((c: number, i: number) => i > 0 && c <= codes[i - 1])) failures.push(`${rel}  projects are not in flight-code order`);
  if (projects.slice(0, featured).some((p: { featured: boolean }) => !p.featured)) failures.push(`${rel}  featured projects must come first`);
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
