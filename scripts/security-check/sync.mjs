// `pnpm security-check:sync`: copies the Security check's precomputed results from the fraud repo
// (payments-fraud-detection: api/scanner.json, api/presets.json and the grid from `make scanner-grid`).
//
// Writes:
// - public/security-check/grid/<model version>/a-<i>-h-<j>.json: the grid chunks, versioned by the model,
//   long-cached (public/_headers); older versions are removed;
// - src/content/security-check-grid.json: the grid's header (steps, object order, band edges, chunk names);
// - src/content/security-check-scanner.json: the inputs, the objects with their lines, and the synthetic
//   passengers with their results.
//
// The fraud repo is found at FRAUD_REPO (default: ../payments-fraud-detection next to this repo).
// Only synthetic bags are copied; no real transaction.
import { copyFile, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const fraud = resolve(process.env.FRAUD_REPO || join(root, "..", "payments-fraud-detection"));
const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

const fail = (message) => {
  console.error(`security-check:sync: ${message}`);
  process.exit(1);
};

if (!existsSync(join(fraud, "api", "scanner.json"))) fail(`no fraud repo at ${fraud} (set FRAUD_REPO)`);
const config = await readJson(join(fraud, "api", "scanner.json"));
const presets = (await readJson(join(fraud, "api", "presets.json"))).presets;
const gridRoot = join(fraud, "api", "generated", "grid");
const versions = existsSync(gridRoot) ? await readdir(gridRoot) : [];
const ready = [];
for (const v of versions) if (existsSync(join(gridRoot, v, "header.json"))) ready.push(v);
if (ready.length !== 1) fail(`expected one finished grid in ${gridRoot}, found ${ready.length} (run make scanner-grid)`);
const version = ready[0];
const header = await readJson(join(gridRoot, version, "header.json"));

// The grid chunks, under a folder named by the model version.
const publicGrid = join(root, "public", "security-check", "grid");
await mkdir(join(publicGrid, version), { recursive: true });
for (const old of await readdir(publicGrid)) if (old !== version) await rm(join(publicGrid, old), { recursive: true });
for (const name of header.chunks) await copyFile(join(gridRoot, version, name), join(publicGrid, version, name));

// A stored record back to the result shape, with the objects' lines.
const lines = Object.fromEntries(config.objects.map((o) => [o.id, o]));
function decode(record) {
  const [verdict, percentile, score, ...shares] = record;
  const objects = header.objects
    .map((id, i) => {
      const direction = shares[i] > 0 ? "raised" : "lowered";
      return { id, share: Math.abs(shares[i]) / 1000, direction, line: lines[id][direction] };
    })
    .sort((a, b) => b.share - a.share);
  return { verdict: header.verdicts[verdict], percentile: percentile / 10, score, objects };
}

// How many cells of each verdict every chunk holds, so a random passenger can pick a verdict first and then
// a chunk that has it (downloading only that chunk).
const counts = [];
for (const name of header.chunks) {
  const { records } = await readJson(join(gridRoot, version, name));
  const c = header.verdicts.map(() => 0);
  for (const r of records) c[r[0]]++;
  counts.push(c);
}

const { presets: presetRecords, ...gridHeader } = header;
await writeFile(
  join(root, "src", "content", "security-check-grid.json"),
  JSON.stringify({ ...gridHeader, counts, path: `/security-check/grid/${version}/` }, null, 2) + "\n",
);

const passengers = presets.map((p) => {
  const result = decode(presetRecords[p.id]);
  if (result.verdict !== p.expected) fail(`${p.id} is stored as ${result.verdict}, expected ${p.expected}`);
  return { id: p.id, name: p.name, expected: p.expected, inputs: p.inputs, result };
});
await writeFile(
  join(root, "src", "content", "security-check-scanner.json"),
  JSON.stringify(
    {
      about: "Copied from the fraud repo by pnpm security-check:sync. Synthetic passengers only; no real transaction.",
      modelVersion: version,
      bands: header.bands,
      inputs: config.inputs,
      objects: config.objects.map(({ id, label, meaning, raised, lowered }) => ({ id, label, meaning, raised, lowered })),
      presets: passengers,
    },
    null,
    2,
  ) + "\n",
);

console.log(`security-check:sync: model ${version}, ${header.chunks.length} chunks -> public/security-check/grid/${version}/`);
for (const p of passengers) {
  const top = p.result.objects.slice(0, 3).map((o) => `${o.id} ${o.direction} ${(o.share * 100).toFixed(0)}%`).join(", ");
  console.log(`  ${p.id.padEnd(22)} ${p.result.verdict.padEnd(9)} percentile ${String(p.result.percentile).padStart(5)}  ${top}`);
}
