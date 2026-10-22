// Phase 5b check: the precomputed grid as served by the site (`pnpm preview`).
// Usage: node scripts/qa/security-grid.mjs [url] [outFile]
//
// - Five random bags are looked up with the site's own helper (src/lib/security-check-grid.ts) over HTTP,
//   and compared with the fraud repo's stored records (decoded independently here).
// - Every request is logged: a lookup downloads at most its one chunk, and a repeat downloads nothing.
// - The chunk responses are long-cached, a missing chunk is an error the caller can show, and the six
//   passengers' stored results match the fraud repo's header.
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createGridLookup } from "../../src/lib/security-check-grid.ts";

const base = (process.argv[2] || "http://localhost:8787").replace(/\/+$/, "");
const outFile = process.argv[3];
const root = resolve(import.meta.dirname, "../..");
const fraud = resolve(process.env.FRAUD_REPO || join(root, "..", "payments-fraud-detection"));
const header = JSON.parse(readFileSync(join(root, "src/content/security-check-grid.json"), "utf8"));
const scanner = JSON.parse(readFileSync(join(root, "src/content/security-check-scanner.json"), "utf8"));
const lines = Object.fromEntries(scanner.objects.map((o) => [o.id, { raised: o.raised, lowered: o.lowered }]));
const stored = (name) => JSON.parse(readFileSync(join(fraud, "api/generated/grid", header.modelVersion, name), "utf8"));
const fraudHeader = JSON.parse(readFileSync(join(fraud, "api/generated/grid", header.modelVersion, "header.json"), "utf8"));

const requests = [];
const fetcher = async (url) => {
  requests.push(url.replace(base, ""));
  return fetch(url);
};
const lookup = createGridLookup(header, lines, fetcher, base);

// Independent decoding of a stored record, for the comparison.
function expected(record) {
  const [v, pct, score, ...shares] = record;
  return {
    verdict: header.verdicts[v],
    percentile: pct / 10,
    score,
    objects: header.objects
      .map((id, i) => ({ id, share: Math.abs(shares[i]) / 1000, direction: shares[i] > 0 ? "raised" : "lowered" }))
      .sort((a, b) => b.share - a.share),
  };
}

const withoutLine = (o) => ({ id: o.id, share: o.share, direction: o.direction });

let seed = 20261021;
const rand = (n) => {
  seed = (seed * 1103515245 + 12345) % 2 ** 31;
  return Math.floor((seed / 2 ** 31) * n);
};

const report = { url: base, lookups: [], repeat: null, presets: [], cache: null, missing: null };
for (let i = 0; i < 5; i++) {
  const bag = {
    amountStep: rand(header.amount.length),
    hourBand: rand(header.hour.length),
    choices: Object.fromEntries(header.choices.map((c) => [c.id, c.values[rand(c.values.length)]])),
  };
  const before = requests.length;
  const got = await lookup.lookup(bag);
  let index = 0;
  for (const c of header.choices) index = index * c.values.length + c.values.indexOf(bag.choices[c.id]);
  const want = expected(stored(`a-${bag.amountStep}-h-${bag.hourBand}.json`).records[index]);
  const same = JSON.stringify({ ...got, objects: got.objects.map(withoutLine) }) === JSON.stringify(want);
  report.lookups.push({
    bag: { amount: header.amount[bag.amountStep], hours: `${header.hour[bag.hourBand].from}-${header.hour[bag.hourBand].to}`, ...bag.choices },
    verdict: got.verdict,
    percentile: got.percentile,
    score: got.score,
    top: got.objects.slice(0, 2).map((o) => `${o.line} (${Math.round(o.share * 100)}%)`),
    matchesStored: same,
    requests: requests.slice(before),
  });
}

// The same bag again: nothing new is downloaded.
const before = requests.length;
await lookup.lookup({ amountStep: 0, hourBand: 0, choices: Object.fromEntries(header.choices.map((c) => [c.id, c.values[0]])) });
await lookup.lookup({ amountStep: 0, hourBand: 0, choices: Object.fromEntries(header.choices.map((c) => [c.id, c.values.at(-1)])) });
report.repeat = { requests: requests.slice(before), note: "two lookups in one chunk: at most one download" };

// The passengers' stored results equal the fraud repo's header.
for (const p of scanner.presets) {
  const want = expected(fraudHeader.presets[p.id]);
  const got = { ...p.result, objects: p.result.objects.map(withoutLine) };
  report.presets.push({ id: p.id, verdict: p.result.verdict, expected: p.expected, matchesStored: JSON.stringify(got) === JSON.stringify(want) });
}

// Cache headers on a chunk, and a missing chunk.
const res = await fetch(`${base}${header.path}${header.chunks[0]}`);
report.cache = { status: res.status, cacheControl: res.headers.get("cache-control"), contentType: res.headers.get("content-type") };
const broken = createGridLookup({ ...header, path: "/security-check/grid/no-such-model/" }, lines, (url) => fetch(url), base);
try {
  await broken.lookup({ amountStep: 0, hourBand: 0, choices: Object.fromEntries(header.choices.map((c) => [c.id, c.values[0]])) });
  report.missing = "no error (unexpected)";
} catch (e) {
  report.missing = `rejected: ${e.message}`;
}

const text = JSON.stringify(report, null, 2);
if (outFile) writeFileSync(outFile, text + "\n");
console.log(text);
const ok = report.lookups.every((l) => l.matchesStored && l.requests.length <= 1) && report.presets.every((p) => p.matchesStored && p.verdict === p.expected) && report.repeat.requests.length <= 1 && report.missing.startsWith("rejected");
console.log(ok ? "\nsecurity-grid: all checks passed" : "\nsecurity-grid: FAILED");
process.exit(ok ? 0 : 1);
