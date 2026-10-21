// `pnpm security-check:sync`: copies the scanner's public configuration from the running scanner API
// (payments-fraud-detection, api/) into src/content/security-check-scanner.json: the verdict band edges,
// the inputs a visitor can set, the objects with their lines, and the synthetic passengers with their
// real results (kept as the cached fallback for when the live scanner is offline).
//
// Start the scanner first (`make scanner-serve` in the fraud repo). The URL comes from
// SECURITY_CHECK_API_URL (default http://127.0.0.1:8080). Only synthetic passengers are copied.
import { writeFile } from "node:fs/promises";

const base = (process.env.SECURITY_CHECK_API_URL || "http://127.0.0.1:8080").replace(/\/+$/, "");
const out = new URL("../../src/content/security-check-scanner.json", import.meta.url);

async function call(path, body) {
  const res = await fetch(base + path, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {});
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status} ${await res.text()}`);
  return res.json();
}

let health, presets;
try {
  health = await call("/health");
  presets = await call("/presets");
} catch (e) {
  console.error(`security-check:sync: the scanner API is not reachable at ${base} (${e.message}). Start it with \`make scanner-serve\` in the fraud repo.`);
  process.exit(1);
}

const passengers = [];
for (const p of presets.presets) {
  const r = await call("/score", { preset: p.id });
  if (r.verdict !== p.expected) {
    console.error(`security-check:sync: ${p.id} scored ${r.verdict}, expected ${p.expected}`);
    process.exit(1);
  }
  passengers.push({
    id: p.id,
    name: p.name,
    expected: p.expected,
    inputs: p.inputs,
    cached: { verdict: r.verdict, percentile: r.percentile, score: r.score, objects: r.objects },
  });
}

const data = {
  about: "Copied from the scanner API by pnpm security-check:sync. Synthetic passengers only; no real transaction.",
  modelVersion: health.model_version,
  bands: health.bands,
  inputs: presets.inputs,
  objects: presets.objects,
  presets: passengers,
};
await writeFile(out, JSON.stringify(data, null, 2) + "\n");
console.log(`security-check:sync: model ${health.model_version}, ${passengers.length} passengers, ${presets.objects.length} objects -> src/content/security-check-scanner.json`);
for (const p of passengers) {
  const top = p.cached.objects.slice(0, 3).map((o) => `${o.id} ${o.direction} ${(o.share * 100).toFixed(0)}%`).join(", ");
  console.log(`  ${p.id.padEnd(22)} ${p.cached.verdict.padEnd(9)} percentile ${String(p.cached.percentile).padStart(5)}  ${top}`);
}
