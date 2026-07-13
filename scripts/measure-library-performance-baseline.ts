#!/usr/bin/env bun

import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";

type TierMeasurement = {
  tier: number;
  runs: number;
  cardModelMs: Stats;
  denseModelMs: Stats;
  refilterMs: Stats;
  payloadLite: PayloadStats;
  payloadDetailGraph: PayloadStats;
};

type Stats = {
  values: number[];
  median: number;
  p95: number;
  min: number;
  max: number;
};

type PayloadStats = {
  bytes: number;
  stringifyMs: Stats;
  parseMs: Stats;
};

type SyntheticLibraryItem = {
  id: string;
  name: string;
  category: string;
  folder: string;
  supplier: string;
  brand: string;
  unit: string;
  unitCost: number;
  miscCost: number;
  pricingSource: string;
  pricingDate: string | null;
  lifecycleState: "available" | "draft" | "discontinued";
  detailGraph?: {
    priceOptions: Array<{ id: string; unitCost: number; isDefault: boolean }>;
    priceHistory: Array<{ id: string; unitCost: number; effectiveAt: string }>;
    stateHistory: Array<{ id: string; state: string; changedAt: string }>;
    attachments: Array<{ id: string; contentType: string; sizeBytes: number }>;
  };
};

const evidenceDir = ".ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/_evidence/phase-0a";

function readTierList() {
  const raw = process.env.LIBRARY_PERF_TIERS?.trim();
  if (!raw) return [100, 500, 5_000, 10_000];
  const tiers = raw.split(",").map((value) => Number(value.trim()));
  if (tiers.some((tier) => !Number.isInteger(tier) || tier <= 0)) {
    throw new Error("LIBRARY_PERF_TIERS must be a comma-separated list of positive integers.");
  }
  return tiers;
}

function readRunCount() {
  const runs = Number(process.env.LIBRARY_PERF_RUNS ?? 5);
  if (!Number.isInteger(runs) || runs < 3) throw new Error("LIBRARY_PERF_RUNS must be an integer >= 3.");
  return runs;
}

function roundMs(value: number) {
  return Math.round(value * 100) / 100;
}

function measure<T>(fn: () => T): { value: T; ms: number } {
  const startedAt = performance.now();
  const value = fn();
  return { value, ms: roundMs(performance.now() - startedAt) };
}

function stats(values: number[]): Stats {
  const sorted = [...values].sort((a, b) => a - b);
  const medianIndex = Math.floor(sorted.length / 2);
  const p95Index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);
  return {
    values,
    median: sorted.length % 2 === 0 ? roundMs((sorted[medianIndex - 1] + sorted[medianIndex]) / 2) : sorted[medianIndex],
    p95: sorted[p95Index],
    min: sorted[0],
    max: sorted[sorted.length - 1],
  };
}

function buildItem(tier: number, index: number, includeDetailGraph: boolean): SyntheticLibraryItem {
  const row = index + 1;
  const item: SyntheticLibraryItem = {
    id: `perf-library-${tier}-${String(row).padStart(5, "0")}`,
    name: `Performance Library Item ${tier}-${String(row).padStart(5, "0")}`,
    category: `Performance Category ${1 + (index % 16)}`,
    folder: `Performance Folder ${String(1 + (index % 24)).padStart(2, "0")}`,
    supplier: `Performance Supplier ${String(1 + (index % 12)).padStart(2, "0")}`,
    brand: `Performance Brand ${String(1 + (index % 18)).padStart(2, "0")}`,
    unit: index % 3 === 0 ? "sqm" : index % 3 === 1 ? "pc" : "lot",
    unitCost: 125 + ((tier + index * 17) % 9750),
    miscCost: index % 5 === 0 ? 25 : 0,
    pricingSource: `https://example.test/performance-cost-library/${tier}/${row}`,
    pricingDate: index % 13 === 0 ? null : "2026-06-22",
    lifecycleState: index % 31 === 0 ? "discontinued" : index % 17 === 0 ? "draft" : "available",
  };

  if (!includeDetailGraph) return item;
  return {
    ...item,
    detailGraph: {
      priceOptions: Array.from({ length: 3 }, (_, optionIndex) => ({
        id: `${item.id}-option-${optionIndex + 1}`,
        unitCost: item.unitCost + optionIndex * 19,
        isDefault: optionIndex === 0,
      })),
      priceHistory: Array.from({ length: 4 }, (_, historyIndex) => ({
        id: `${item.id}-price-history-${historyIndex + 1}`,
        unitCost: item.unitCost + historyIndex * 11,
        effectiveAt: `2026-0${1 + (historyIndex % 6)}-15T00:00:00.000Z`,
      })),
      stateHistory: Array.from({ length: 2 }, (_, historyIndex) => ({
        id: `${item.id}-state-${historyIndex + 1}`,
        state: historyIndex === 0 ? "draft" : item.lifecycleState,
        changedAt: `2026-0${1 + historyIndex}-01T00:00:00.000Z`,
      })),
      attachments: Array.from({ length: 2 }, (_, attachmentIndex) => ({
        id: `${item.id}-attachment-${attachmentIndex + 1}`,
        contentType: attachmentIndex === 0 ? "application/pdf" : "image/webp",
        sizeBytes: 48_000 + attachmentIndex * 1024,
      })),
    },
  };
}

function buildItems(tier: number, includeDetailGraph: boolean) {
  return Array.from({ length: tier }, (_, index) => buildItem(tier, index, includeDetailGraph));
}

function buildCardModel(items: SyntheticLibraryItem[]) {
  return items
    .map((item) => ({
      id: item.id,
      title: item.name,
      folder: item.folder,
      supplier: item.supplier || "No supplier",
      priceLabel: `${item.unitCost + item.miscCost}:${item.unit}`,
      freshness: item.pricingDate ? "dated" : "missing",
    }))
    .sort((a, b) => a.folder.localeCompare(b.folder) || a.title.localeCompare(b.title));
}

function buildDenseModel(items: SyntheticLibraryItem[]) {
  return items
    .map((item) => ({
      id: item.id,
      name: item.name,
      folder: item.folder,
      supplier: item.supplier,
      brand: item.brand,
      cost: item.unitCost + item.miscCost,
      pricingSource: item.pricingSource,
      pricingDate: item.pricingDate ?? "",
      lifecycleState: item.lifecycleState,
    }))
    .sort((a, b) => a.folder.localeCompare(b.folder) || a.name.localeCompare(b.name));
}

function refilter(items: SyntheticLibraryItem[]) {
  const query = "supplier 07";
  return items.filter((item) => {
    const haystack = `${item.name} ${item.category} ${item.folder} ${item.supplier} ${item.brand}`.toLowerCase();
    return haystack.includes(query);
  });
}

function measurePayload(items: SyntheticLibraryItem[], runs: number): PayloadStats {
  const stringifyValues: number[] = [];
  const parseValues: number[] = [];
  let payload = "";

  for (let run = 0; run < runs; run += 1) {
    const stringifyMeasurement = measure(() => JSON.stringify(items));
    payload = stringifyMeasurement.value;
    stringifyValues.push(stringifyMeasurement.ms);
    parseValues.push(measure(() => JSON.parse(payload) as SyntheticLibraryItem[]).ms);
  }

  return {
    bytes: Buffer.byteLength(payload, "utf8"),
    stringifyMs: stats(stringifyValues),
    parseMs: stats(parseValues),
  };
}

function measureTier(tier: number, runs: number): TierMeasurement {
  const liteItems = buildItems(tier, false);
  const detailItems = buildItems(tier, true);
  const cardValues: number[] = [];
  const denseValues: number[] = [];
  const refilterValues: number[] = [];

  for (let run = 0; run < runs; run += 1) {
    cardValues.push(measure(() => buildCardModel(liteItems)).ms);
    denseValues.push(measure(() => buildDenseModel(liteItems)).ms);
    refilterValues.push(measure(() => refilter(liteItems)).ms);
  }

  return {
    tier,
    runs,
    cardModelMs: stats(cardValues),
    denseModelMs: stats(denseValues),
    refilterMs: stats(refilterValues),
    payloadLite: measurePayload(liteItems, runs),
    payloadDetailGraph: measurePayload(detailItems, runs),
  };
}

function gitSha() {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function formatBytes(bytes: number) {
  return `${Math.round((bytes / 1024) * 10) / 10} KB`;
}

function renderMarkdown(measurements: TierMeasurement[], metadata: Record<string, unknown>) {
  const rows = measurements
    .map((item) => `| ${item.tier.toLocaleString()} | ${item.runs} | ${item.cardModelMs.median} / ${item.cardModelMs.p95} | ${item.denseModelMs.median} / ${item.denseModelMs.p95} | ${item.refilterMs.median} / ${item.refilterMs.p95} | ${formatBytes(item.payloadLite.bytes)} | ${item.payloadLite.parseMs.median} / ${item.payloadLite.parseMs.p95} | ${formatBytes(item.payloadDetailGraph.bytes)} | ${item.payloadDetailGraph.parseMs.median} / ${item.payloadDetailGraph.parseMs.p95} |`)
    .join("\n");

  return `# Phase 0A Library Performance Baseline

Generated: ${metadata.generatedAt}
Git commit: ${metadata.gitCommit}
Command: \`${metadata.command}\`

This is a deterministic local baseline for the Library plan's 100 / 500 / 5,000 / 10,000 component tiers. It measures the same tier shape as \`scripts/seed-performance-test-data.ts\`: folder, supplier, brand, pricing, lifecycle, and optional nested detail graph.

Important boundary: this artifact measures local model-building, client refilter, and JSON stringify/parse costs. It does not claim authenticated browser Core Web Vitals, React Profiler commit duration, Supabase transfer bytes, or Safari/iOS evidence. Those remain separate browser/provider gates.

| Tier | Runs | Card model median/p95 ms | Dense model median/p95 ms | Refilter median/p95 ms | Lite payload | Lite parse median/p95 ms | Detail payload | Detail parse median/p95 ms |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
${rows}

## Notes

- P95 is the nearest-rank p95 across ${measurements[0]?.runs ?? 0} runs.
- Lite payload approximates \`includeDetailGraph=false\` browse rows.
- Detail payload approximates eager per-item versions, price history, state history, and attachments.
- This artifact converts the prior manifest-only seed proof into a repeatable timing baseline, but it intentionally does not mutate Supabase data.
`;
}

function main() {
  const tiers = readTierList();
  const runs = readRunCount();
  const generatedAt = new Date().toISOString();
  const stamp = generatedAt.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const outputBase = resolve(process.env.LIBRARY_PERF_OUTPUT_BASE ?? `${evidenceDir}/library-phase0a-perf-baseline-${stamp}`);
  const metadata = {
    generatedAt,
    gitCommit: gitSha(),
    command: `LIBRARY_PERF_RUNS=${runs} LIBRARY_PERF_TIERS=${tiers.join(",")} bun run scripts/measure-library-performance-baseline.ts`,
    environment: {
      runtime: `bun ${Bun.version}`,
      platform: process.platform,
      arch: process.arch,
    },
  };
  const measurements = tiers.map((tier) => measureTier(tier, runs));
  const json = {
    ...metadata,
    measurements,
  };

  mkdirSync(dirname(outputBase), { recursive: true });
  writeFileSync(`${outputBase}.json`, `${JSON.stringify(json, null, 2)}\n`, "utf8");
  writeFileSync(`${outputBase}.md`, renderMarkdown(measurements, metadata), "utf8");

  console.log(JSON.stringify({ outputBase, tiers, runs }, null, 2));
}

main();
