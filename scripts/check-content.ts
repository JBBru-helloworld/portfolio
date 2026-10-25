/*
 * Content checks for src/content/. Run with `pnpm check:content` (Node 24 runs TypeScript directly).
 *
 * Fails on: excluded words and phrases, the Sunway Tech Club outside its two approved lines, em dashes, common US spellings in strings,
 * third-person pronouns in strings (the site speaks in the first person),
 * seat-map problems (symbols, zones, seat-sign names), departures-board rows that do not fit, destinations
 * whose section is not on the page, and project problems (duplicate slugs or flight codes, unknown stack ids,
 * a featured project without a summary, seat-sign names off the flaps, repeated emblems, image counts that
 * do not match the built media).
 * Warns (does not fail) on every TODO(owner) and CHECK(owner) until launch.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
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

// The owner allows the Sunway Tech Club to be named for these two credentials only (Phase 2a; the repeated
// "(2025)" dropped in Phase 6, as the date is shown above each).
const CLUB = /sunway\s+tech\s+club/i;
const CLUB_ALLOWED = [
  "Coordinated a five-week Generative AI Study Jam for 900+ participants with the Sunway Tech Club.",
  "Co-led a portfolio workshop with the Sunway Tech Club, alongside a speaker from Google.",
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

// The content modules, and the scanner's copied configuration (its lines are visitor-facing copy too).
const files = readdirSync(contentDir).filter((f) => f.endsWith(".ts") || f === "security-check-scanner.json");

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

// Seat map (the tech stack): symbols unique (ignoring case), one to three characters starting with a capital;
// every technology in exactly one known zone; no empty zone; names that fit the corner sign's flaps.
{
  const rel = "src/content/stack.ts";
  const { stack, zones } = await import(join(contentDir, "stack.ts"));
  const seqFile = readFileSync(join(root, "src", "lib", "flap-sequence.ts"), "utf8");
  const flaps = new Set(seqFile.match(/FLAP_SEQUENCE\s*=\s*"([^"]*)"/)?.[1] ?? "");
  const zoneNames = new Set(zones.map((z: { name: string }) => z.name));
  const symbols = new Map<string, string>();
  const ids = new Set<string>();
  const perZone = new Map<string, number>();
  for (const e of stack as { id: string; symbol: string; name: string; zone: string }[]) {
    const at = `${rel} (${e.name})`;
    if (!/^[A-Z][A-Za-z0-9]{0,2}$/.test(e.symbol)) failures.push(`${at}  symbol "${e.symbol}" is not one to three characters starting with a capital`);
    const key = e.symbol.toLowerCase();
    if (symbols.has(key)) failures.push(`${at}  symbol "${e.symbol}" clashes with ${symbols.get(key)}`);
    else symbols.set(key, e.name);
    if (ids.has(e.id)) failures.push(`${at}  duplicate id "${e.id}"`);
    ids.add(e.id);
    if (!zoneNames.has(e.zone)) failures.push(`${at}  zone "${e.zone}" is not one of the six zones`);
    perZone.set(e.zone, (perZone.get(e.zone) ?? 0) + 1);
    // The corner sign reads "SEAT 12A · <NAME>" on 28 flap tiles: at most 17 characters, all on the flaps.
    const sign = e.name.toUpperCase();
    if (sign.length > 17) failures.push(`${at}  name is ${sign.length} characters; the seat sign fits 17`);
    const off = [...new Set([...sign].filter((c) => !flaps.has(c)))];
    if (off.length) failures.push(`${at}  name uses characters not on the flaps: ${off.map((c) => JSON.stringify(c)).join(" ")}`);
  }
  for (const z of zones as { letter: string; name: string }[]) {
    if (!perZone.get(z.name)) failures.push(`${rel}  zone ${z.letter} (${z.name}) is empty`);
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

  // The logbook's "View flight" links: each points at a real project page.
  const { experience } = await load("experience.ts");
  const slugs = new Set(projects.map((p: { slug: string }) => p.slug));
  for (const e of experience as { slug: string; project?: string }[]) {
    if (e.project && !slugs.has(e.project)) failures.push(`src/content/experience.ts  ${e.slug}: project "${e.project}" is not a project slug`);
  }
}

// The Security check: the scanner's copied configuration is complete and its passengers are synthetic.
{
  const rel = "src/content/security-check-scanner.json";
  try {
    const scanner = JSON.parse(readFileSync(join(contentDir, "security-check-scanner.json"), "utf8"));
    const objectIds = ["receipt", "clock", "cards", "phone", "compass", "envelope", "other"];
    const verdicts = ["CLEARED", "SCREENING", "STOPPED"];
    const ids = scanner.objects.map((o: { id: string }) => o.id);
    if (ids.join() !== objectIds.join()) failures.push(`${rel}  objects are ${ids.join(", ")} (expected ${objectIds.join(", ")})`);
    for (const o of scanner.objects) if (!o.raised || !o.lowered) failures.push(`${rel}  object ${o.id} needs both lines`);
    for (const p of scanner.presets) {
      if (!verdicts.includes(p.expected)) failures.push(`${rel}  ${p.id}: unknown verdict ${p.expected}`);
      if (p.result?.verdict !== p.expected) failures.push(`${rel}  ${p.id}: stored result ${p.result?.verdict} differs from its expected ${p.expected} (run pnpm security-check:sync)`);
      const shares = (p.result?.objects ?? []).reduce((sum: number, o: { share: number }) => sum + o.share, 0);
      if (Math.abs(shares - 1) > 0.005) failures.push(`${rel}  ${p.id}: object shares add up to ${shares}`);
    }
    for (const v of verdicts) if (!scanner.presets.some((p: { expected: string }) => p.expected === v)) failures.push(`${rel}  no passenger lands on ${v}`);
    if (!(scanner.bands.screening.score < scanner.bands.stopped.score)) failures.push(`${rel}  band edges out of order`);

    // The precomputed grid: the header matches the scanner, and every chunk it names is published.
    const gridRel = "src/content/security-check-grid.json";
    const grid = JSON.parse(readFileSync(join(contentDir, "security-check-grid.json"), "utf8"));
    if (grid.objects.join() !== ids.join()) failures.push(`${gridRel}  object order ${grid.objects.join(", ")} differs from the scanner's objects`);
    if (grid.modelVersion !== scanner.modelVersion) failures.push(`${gridRel}  model ${grid.modelVersion} differs from the scanner content's ${scanner.modelVersion}`);
    if (grid.path !== `/security-check/grid/${grid.modelVersion}/`) failures.push(`${gridRel}  path ${grid.path} is not versioned by the model`);
    const expectedChunks = grid.amount.length * grid.hour.length;
    if (grid.chunks.length !== expectedChunks) failures.push(`${gridRel}  ${grid.chunks.length} chunks named (expected ${expectedChunks})`);
    const publicDir = join(root, "public", ...grid.path.split("/").filter(Boolean));
    for (const name of grid.chunks) {
      try {
        const chunk = JSON.parse(readFileSync(join(publicDir, name), "utf8"));
        if (chunk.modelVersion !== grid.modelVersion) failures.push(`public${grid.path}${name}  from model ${chunk.modelVersion}`);
      } catch {
        failures.push(`public${grid.path}${name}  missing (run pnpm security-check:sync)`);
      }
    }
    // Every packed-bag choice the scanner offers has stored results, and nothing more.
    for (const c of grid.choices) {
      const input = scanner.inputs.find((i: { id: string }) => i.id === c.id);
      if (!input || input.options.join() !== c.values.join()) failures.push(`${gridRel}  ${c.id} values differ from the scanner's inputs`);
    }
    // The random passenger's weighting needs every chunk's verdict counts.
    if (!Array.isArray(grid.counts) || grid.counts.length !== grid.chunks.length) failures.push(`${gridRel}  verdict counts missing (run pnpm security-check:sync)`);
    for (let v = 0; v < verdicts.length; v++)
      if (Array.isArray(grid.counts) && !grid.counts.some((c: number[]) => c[v] > 0)) failures.push(`${gridRel}  no cell is ${verdicts[v]}`);
  } catch {
    failures.push(`${rel} or the grid  missing or unreadable (run pnpm security-check:sync)`);
  }

  // The scanner's words (Phase 5c): the dataset's clock is not a local time and its amounts are US dollars,
  // the results are precomputed, and the score is not a probability.
  const words: { label: string; pattern: RegExp }[] = [
    { label: "a clock time", pattern: /\b\d{1,2}(:\d{2})?\s*(a\.?m\.?|p\.?m\.?)(?![a-z])/i },
    { label: "a time of day", pattern: /late[- ]night|midnight|\bovernight\b|o'clock|small hours/i },
    { label: "ringgit (amounts are US dollars)", pattern: /\bRM\s?\d/ },
    { label: "\"live\" (results are precomputed)", pattern: /(?<!aria-)\blive\b/i },
    { label: "\"probability\" (the score is a percentile)", pattern: /probabilit/i },
  ];
  const scannerFiles = [
    "src/content/security-check.ts",
    "src/content/security-check-scanner.json",
    ...readdirSync(join(root, "src", "components", "security")).map((f) => `src/components/security/${f}`),
  ];
  for (const file of scannerFiles) {
    const text = readFileSync(join(root, file), "utf8");
    // Comments may explain the rules; only strings and markup reach the page.
    const visible = text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
    for (const w of words) {
      const m = w.pattern.exec(visible);
      if (m) failures.push(`${file}  ${w.label}: "${m[0]}"`);
    }
  }
  const destinationsText = readFileSync(join(contentDir, "destinations.ts"), "utf8");
  if (/LIVE FRAUD|Live fraud/.test(destinationsText)) failures.push(`src/content/destinations.ts  the fraud demo is precomputed: "FRAUD DEMO", not "LIVE FRAUD DEMO"`);

  // The bags: every bag's images and packing area exist.
  try {
    const bags = JSON.parse(readFileSync(join(contentDir, "security-check-bags.json"), "utf8")).bags;
    if (bags.length !== 3) failures.push(`src/content/security-check-bags.json  ${bags.length} bags (expected 3)`);
    for (const b of bags) {
      if (!(b.packing?.length >= 3)) failures.push(`src/content/security-check-bags.json  ${b.id}: no packing area`);
      for (const kind of ["photo", "xray"])
        for (const w of b.widths)
          for (const ext of ["avif", "webp"])
            if (!existsSync(join(root, "public", "security-check", "bags", `${b.id}-${kind}-${w}.${ext}`)))
              failures.push(`public/security-check/bags/${b.id}-${kind}-${w}.${ext}  missing (run pnpm bags:build)`);
      if (!existsSync(join(root, "public", "security-check", "bags", `${b.id}-shadow.webp`))) failures.push(`public/security-check/bags/${b.id}-shadow.webp  missing (run pnpm bags:build)`);
    }
    for (const v of ["cleared", "screening", "stopped"])
      if (!existsSync(join(root, "public", "security-check", `stamp-${v}.webp`))) failures.push(`public/security-check/stamp-${v}.webp  missing (run pnpm stamps:build)`);
  } catch {
    failures.push("src/content/security-check-bags.json  missing or unreadable (run pnpm bags:build)");
  }
  // Never a real transaction: no transaction IDs and nothing from the fraud repo's local examples, anywhere in content.
  for (const file of readdirSync(contentDir)) {
    const text = readFileSync(join(contentDir, file), "utf8");
    if (/TransactionID|local_examples/.test(text)) failures.push(`src/content/${file}  names a real transaction (TransactionID or local_examples)`);
  }
}

// The passport (Phase 5d): the machine-readable zone is two lines of exactly 44 characters, A to Z and "<",
// and the data page carries nothing that looks like real passport data.
{
  const rel = "src/content/passport.ts";
  const text = readFileSync(join(contentDir, "passport.ts"), "utf8");
  const mrz = text.match(/mrz:\s*\[\s*"([^"]*)",\s*"([^"]*)"\s*\]/);
  if (!mrz) failures.push(`${rel}  mrz not found`);
  else
    for (const line of [mrz[1], mrz[2]]) {
      if (line.length !== 44) failures.push(`${rel}  MRZ line is ${line.length} characters, not 44: ${line}`);
      if (!/^[A-Z<]+$/.test(line)) failures.push(`${rel}  MRZ line has characters other than A to Z and "<": ${line}`);
    }
  const values = text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  if (/date of birth|passport no|passport number|\bdob\b/i.test(values)) failures.push(`${rel}  no passport number or date of birth on the data page`);
}

// The resume: a warning (not a failure) until `pnpm resume:build` has published a clean one.
{
  try {
    const resume = JSON.parse(readFileSync(join(contentDir, "resume-media.json"), "utf8"));
    if (!resume.available)
      warnings.push("src/content/resume-media.json  no resume published: add the PDF to assets/resume/ and run pnpm resume:build (the Resume product is hidden meanwhile)");
  } catch {
    warnings.push("src/content/resume-media.json  missing: run pnpm resume:build");
  }
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
