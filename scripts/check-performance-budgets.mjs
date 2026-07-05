#!/usr/bin/env bun
// ponytail: WP-P4-01 — Advisory CI perf-budget gate (non-blocking, 2-week advisory window per OPEN-PERF-05).
// Reads .next/diagnostics/route-bundle-stats.json (Next 16 Turbopack built-in),
// computes gzipped first-load JS per route, and warns when any route exceeds
// the configured budget. Exit code is always 0 (advisory); a non-zero exit is
// reserved for the post-advisory-window promotion.
//
// Usage:
//   bun run scripts/check-performance-budgets.mjs
//   bun run scripts/check-performance-budgets.mjs --strict   # exit 1 if any route over budget
//
// Wired into .github/workflows/ci.yml after `bun run build`.

import { existsSync, readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { resolve } from "node:path";

const BUDGET_KB = Number(process.env.PERF_BUDGET_KB ?? "350");
const STRICT = process.argv.includes("--strict") || process.env.PERF_BUDGET_STRICT === "1";
const STATS_PATH = resolve(".next/diagnostics/route-bundle-stats.json");

if (!existsSync(STATS_PATH)) {
  const msg = `[perf-budget] SKIP: ${STATS_PATH} not found. Run \`bun run build\` first.`;
  if (STRICT) {
    console.error(msg);
    console.error("[perf-budget] FAIL: strict mode requires the diagnostics artifact to exist.");
    process.exit(1);
  }
  console.warn(msg);
  process.exit(0);
}

const stats = JSON.parse(readFileSync(STATS_PATH, "utf8"));
if (!Array.isArray(stats)) {
  console.error(`[perf-budget] FAIL: ${STATS_PATH} is not an array.`);
  process.exit(STRICT ? 1 : 0);
}

const overBudget = [];
const partialReadRoutes = [];
const rows = [];
for (const entry of stats) {
  let rawBytes = 0;
  let gzBytes = 0;
  let missingChunks = 0;
  for (const chunkPath of entry.firstLoadChunkPaths ?? []) {
    const local = chunkPath.replace(/^\.next\//, ".next/");
    try {
      const buf = readFileSync(local);
      rawBytes += buf.length;
      gzBytes += gzipSync(buf).length;
    } catch {
      missingChunks++;
    }
  }
  // ponytail: Santa-loop round 4 hardening. If any chunk is unreadable, mark
  // the route as a partial-read and surface it. In strict mode, fail the gate
  // because a broken diagnostics file could undercount bundle size and produce
  // a false PASS.
  if (missingChunks > 0) {
    partialReadRoutes.push({ route: entry.route, missingChunks, totalChunks: entry.firstLoadChunkPaths?.length ?? 0 });
  }
  const gzKb = gzBytes / 1024;
  const rawKb = rawBytes / 1024;
  const passes = gzKb <= BUDGET_KB;
  rows.push({
    route: entry.route,
    chunks: entry.firstLoadChunkPaths?.length ?? 0,
    rawKb: rawKb.toFixed(1),
    gzKb: gzKb.toFixed(1),
    passes,
    missingChunks,
  });
  if (!passes) overBudget.push({ ...entry, gzKb, rawKb });
}

rows.sort((a, b) => parseFloat(b.gzKb) - parseFloat(a.gzKb));

const maxRouteLen = Math.max(...rows.map((r) => r.route.length), 8);
const maxGzLen = Math.max(...rows.map((r) => r.gzKb.length), 5);
const maxRawLen = Math.max(...rows.map((r) => r.rawKb.length), 5);

console.log("");
console.log(`Performance budget gate (advisory) — budget: ${BUDGET_KB} KB gzipped first-load JS per route`);
console.log("");
console.log(`  ${"gz KB".padStart(maxGzLen)}  ${"raw KB".padStart(maxRawLen)}  chunks  ${"route".padEnd(maxRouteLen)}  verdict`);
for (const r of rows) {
  const verdict = r.passes ? "PASS" : "OVER";
  const flag = r.passes ? " " : "!";
  console.log(`${flag} ${r.gzKb.padStart(maxGzLen)}  ${r.rawKb.padStart(maxRawLen)}  ${r.chunks.toString().padStart(6)}  ${r.route.padEnd(maxRouteLen)}  ${verdict}`);
}
console.log("");

if (overBudget.length === 0 && partialReadRoutes.length === 0) {
  console.log(`[perf-budget] PASS: all ${rows.length} routes within ${BUDGET_KB} KB budget.`);
  process.exit(0);
}

if (partialReadRoutes.length > 0) {
  console.warn(`[perf-budget] PARTIAL READ: ${partialReadRoutes.length} route(s) had unreadable chunks:`);
  for (const r of partialReadRoutes) {
    console.warn(`  ${r.route}: ${r.missingChunks}/${r.totalChunks} chunks unreadable`);
  }
  console.warn("");
  if (STRICT) {
    console.error("[perf-budget] FAIL: strict mode requires every chunk to be readable.");
    process.exit(1);
  }
  console.warn("[perf-budget] Non-blocking during the advisory window. Investigate the broken diagnostics file.");
}

if (overBudget.length > 0) {
  console.warn(`[perf-budget] ADVISORY: ${overBudget.length} route(s) over ${BUDGET_KB} KB budget:`);
  for (const r of overBudget) {
    console.warn(`  ${r.route}: ${r.gzKb.toFixed(1)} KB gzipped (over by ${(r.gzKb - BUDGET_KB).toFixed(1)} KB)`);
  }
  console.warn("");
  console.warn("[perf-budget] Non-blocking during the 2-week advisory window per OPEN-PERF-05.");
  console.warn("[perf-budget] Promote to blocking by setting PERF_BUDGET_STRICT=1 or passing --strict.");
}
process.exit(STRICT && (overBudget.length > 0 || partialReadRoutes.length > 0) ? 1 : 0);
