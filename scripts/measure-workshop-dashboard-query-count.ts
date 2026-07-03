#!/usr/bin/env bun

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type PerfTraceEvent = {
  label: string;
  kind: "timing" | "database" | "supabase";
  elapsedMs: number;
  operation?: string;
  relation?: string;
};

type PerfTraceSnapshot = {
  requestId: string;
  scope: string;
  timings: PerfTraceEvent[];
  databaseRoundTrips?: number;
  supabaseRoundTrips?: number;
};

type DashboardQueryCountReport = {
  generatedAt: string;
  mode: "workshop-dashboard-query-count";
  source: string;
  sampleCount: number;
  totalDatabaseRoundTrips: number;
  medianDatabaseRoundTrips: number | null;
  p95DatabaseRoundTrips: number | null;
  p99DatabaseRoundTrips: number | null;
  timingLabels: Array<{ label: string; samples: number; medianMs: number | null; p95Ms: number | null }>;
  relationCounts: Array<{ relation: string; operation: string; count: number }>;
  snapshots: PerfTraceSnapshot[];
};

const PERF_JSON_PREFIX = "[perf-json] ";

function percentile(values: number[], percentileRank: number) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.ceil((percentileRank / 100) * sorted.length) - 1);
  return sorted[index] ?? null;
}

function readInput() {
  const inputPath = process.env.PERF_TRACE_INPUT;
  if (!inputPath) {
    throw new Error("PERF_TRACE_INPUT is required. Capture a PERF_TRACE=1 /workshop render log and pass its path.");
  }
  const resolved = resolve(inputPath);
  if (!existsSync(resolved)) throw new Error(`PERF_TRACE_INPUT does not exist: ${resolved}`);
  return { source: resolved, text: readFileSync(resolved, "utf8") };
}

export function parseWorkshopDashboardTraceLog(text: string): PerfTraceSnapshot[] {
  return text
    .split(/\r?\n/)
    .filter((line) => line.startsWith(PERF_JSON_PREFIX))
    .map((line) => JSON.parse(line.slice(PERF_JSON_PREFIX.length)) as PerfTraceSnapshot)
    .filter((snapshot) => snapshot.scope === "workshop.dashboard");
}

export function buildWorkshopDashboardQueryCountReport(source: string, snapshots: PerfTraceSnapshot[]): DashboardQueryCountReport {
  const roundTrips = snapshots.map((snapshot) => snapshot.databaseRoundTrips ?? snapshot.supabaseRoundTrips ?? 0);
  const timingSamples = new Map<string, number[]>();
  const relationCounts = new Map<string, { relation: string; operation: string; count: number }>();

  for (const snapshot of snapshots) {
    for (const event of snapshot.timings) {
      const samples = timingSamples.get(event.label) ?? [];
      samples.push(event.elapsedMs);
      timingSamples.set(event.label, samples);
      if (event.kind === "database" || event.kind === "supabase") {
        const relation = event.relation ?? "unknown";
        const operation = event.operation ?? "query";
        const key = `${operation}:${relation}`;
        const current = relationCounts.get(key) ?? { relation, operation, count: 0 };
        current.count += 1;
        relationCounts.set(key, current);
      }
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    mode: "workshop-dashboard-query-count",
    source,
    sampleCount: snapshots.length,
    totalDatabaseRoundTrips: roundTrips.reduce((sum, count) => sum + count, 0),
    medianDatabaseRoundTrips: percentile(roundTrips, 50),
    p95DatabaseRoundTrips: percentile(roundTrips, 95),
    p99DatabaseRoundTrips: percentile(roundTrips, 99),
    timingLabels: [...timingSamples.entries()].map(([label, samples]) => ({
      label,
      samples: samples.length,
      medianMs: percentile(samples, 50),
      p95Ms: percentile(samples, 95),
    })),
    relationCounts: [...relationCounts.values()].sort((left, right) => right.count - left.count || left.relation.localeCompare(right.relation)),
    snapshots,
  };
}

function main() {
  const { source, text } = readInput();
  const snapshots = parseWorkshopDashboardTraceLog(text);
  if (snapshots.length === 0) {
    throw new Error("No workshop.dashboard [perf-json] snapshots found in PERF_TRACE_INPUT.");
  }

  const report = buildWorkshopDashboardQueryCountReport(source, snapshots);
  const outputPath = resolve(process.env.OUTPUT_FILE ?? ".ai/09_archive/store/workshop-dashboard-query-count.json");
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ outputPath, sampleCount: report.sampleCount, medianDatabaseRoundTrips: report.medianDatabaseRoundTrips }, null, 2));
}

if (import.meta.main) {
  main();
}
