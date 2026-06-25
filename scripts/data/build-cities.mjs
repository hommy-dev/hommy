// Build the checked-in US cities dataset used by the SEO city-page seed.
//
// Source: GeoNames `cities5000` (CC BY 4.0) — every populated place with
// population > 5,000. We filter to the US (50 states + DC) with population
// >= 10,000, which is the canonical list of cities that can become SEO pages
// once roofers cover them. We seed the FULL country so any market is ready the
// moment a roofer covers it — `isOperating` (in src/lib/config/service-areas.ts)
// still controls which states are actually marketed.
//
// Reproduce (one-off, requires network + `unzip` on PATH):
//   node scripts/data/build-cities.mjs
// Output: scripts/data/us-cities.json  (sorted by population desc)
//
// GeoNames tab-separated columns we use:
//   [2] asciiname  [4] lat  [5] lng  [8] country  [10] admin1 (state)  [14] population

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// 50 states + DC (GeoNames admin1 for the US is the 2-letter postal code).
const STATES = new Set([
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID",
  "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO",
  "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA",
  "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
]);
const MIN_POP = 10_000;
const ZIP_URL = "https://download.geonames.org/export/dump/cities5000.zip";
const OUT = new URL("./us-cities.json", import.meta.url);

const dir = mkdtempSync(join(tmpdir(), "geonames-"));
const zipPath = join(dir, "cities5000.zip");

console.log(`Downloading ${ZIP_URL} ...`);
const res = await fetch(ZIP_URL);
if (!res.ok) throw new Error(`download failed: ${res.status}`);
writeFileSync(zipPath, Buffer.from(await res.arrayBuffer()));

console.log("Unzipping ...");
execFileSync("unzip", ["-o", zipPath, "-d", dir], { stdio: "ignore" });
const raw = readFileSync(join(dir, "cities5000.txt"), "utf8");

const rows = [];
for (const line of raw.split("\n")) {
  if (!line) continue;
  const f = line.split("\t");
  const country = f[8];
  const state = f[10];
  const population = Number(f[14]);
  if (country !== "US" || !STATES.has(state) || population < MIN_POP) continue;
  rows.push({
    name: f[2],
    stateCode: state,
    lat: Number(f[4]),
    lng: Number(f[5]),
    population,
  });
}

rows.sort((a, b) => b.population - a.population);
writeFileSync(OUT, JSON.stringify(rows, null, 2) + "\n");

const byState = {};
for (const r of rows) byState[r.stateCode] = (byState[r.stateCode] ?? 0) + 1;
console.log(
  `Wrote ${rows.length} cities across ${Object.keys(byState).length} states → ${OUT.pathname}`,
);
