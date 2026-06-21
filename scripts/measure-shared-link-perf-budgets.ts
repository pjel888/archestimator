#!/usr/bin/env bun

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { buildProjectPublicationSnapshot } from "../src/lib/publication/snapshot";
import {
  createPublicationToken,
  hashPublicationPassword,
  hashPublicationToken,
  verifyPublicationPassword,
} from "../src/lib/publication/security";

type Mode = "recipient-session-tti" | "snapshot-bytes" | "password-unlock" | "rotate-cost";
type SnapshotInput = Parameters<typeof buildProjectPublicationSnapshot>[0];

type CliOptions = {
  mode: Mode;
  rows: number[];
  samples: number;
  out: string;
  append: boolean;
};

type MeasurementRow = {
  date: string;
  gitSha: string;
  env: string;
  fixture: string;
  mode: Mode;
  rowsN: number;
  samples: number;
  p50: number;
  p95: number;
  unit: "bytes" | "ms";
  budget: number;
  status: "PASS" | "FAIL";
  note: string;
};

const DEFAULT_OUT = ".ai/03_plans/2026-06-20-Shared-Link-Feature/evidence/perf-budgets.md";
const DEFAULT_ROWS = "100,1000,10000";
const DEFAULT_SAMPLES = 5;
const DEFAULT_SECRET = "local-perf-budget-secret";

function usage() {
  return [
    "Usage:",
    "  bun scripts/measure-shared-link-perf-budgets.ts --mode <recipient-session-tti|snapshot-bytes|password-unlock|rotate-cost> [--rows 100,1000,10000] [--samples 5] [--out evidence/perf-budgets.md] [--append]",
    "",
    "Notes:",
    "  recipient-session-tti requires SHARE_URL and measures hosted route request duration only.",
    "  snapshot-bytes is local fixture byte measurement of the current snapshot schema.",
    "  password-unlock and rotate-cost are local CPU-only harnesses; provider DB timing remains separate evidence.",
  ].join("\n");
}

export function parsePositiveIntegerList(value: string, label: string) {
  const parsed = value
    .split(",")
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((count) => Number.isInteger(count) && count > 0);
  if (parsed.length === 0) throw new Error(`${label} must include at least one positive integer.`);
  return parsed;
}

function parseArgs(argv = process.argv.slice(2)): CliOptions {
  const values = new Map<string, string>();
  const flags = new Set<string>();
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      console.log(usage());
      process.exit(0);
    }
    if (!arg?.startsWith("--")) continue;
    const key = arg.slice(2);
    if (key === "append") {
      flags.add(key);
      continue;
    }
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) throw new Error(`Missing value for --${key}`);
    values.set(key, next);
    index += 1;
  }

  const mode = values.get("mode");
  if (!isMode(mode)) throw new Error(`--mode is required.\n\n${usage()}`);
  const samples = Number.parseInt(values.get("samples") ?? String(DEFAULT_SAMPLES), 10);
  if (!Number.isInteger(samples) || samples <= 0) throw new Error("--samples must be a positive integer.");

  return {
    mode,
    rows: parsePositiveIntegerList(values.get("rows") ?? DEFAULT_ROWS, "--rows"),
    samples,
    out: values.get("out") ?? DEFAULT_OUT,
    append: flags.has("append"),
  };
}

function isMode(value: string | undefined): value is Mode {
  return value === "recipient-session-tti" || value === "snapshot-bytes" || value === "password-unlock" || value === "rotate-cost";
}

function percentile(values: number[], ratio: number) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1);
  return Math.round(sorted[index] * 100) / 100;
}

function nowDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
}

function gitSha() {
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function bytesBudget(rowCount: number) {
  if (rowCount <= 100) return 64 * 1024;
  if (rowCount <= 1000) return 512 * 1024;
  return 4 * 1024 * 1024;
}

function rotateBudgetMs(recipientCount: number) {
  if (recipientCount <= 10) return 500;
  if (recipientCount <= 100) return 2000;
  return 8000;
}

function makeSnapshotFixture(rowCount: number): SnapshotInput {
  const nodes = Array.from({ length: 20 }, (_, index) => ({
    id: `node-${index + 1}`,
    name: `Scope area ${index + 1}`,
    kind: "area" as const,
    parentId: null,
    sortOrder: index,
    estimateTabId: "tab-main",
  }));
  return {
    generatedAt: "2026-06-21T00:00:00.000Z",
    project: {
      id: "project-perf",
      name: "Shared-link performance fixture",
      projectCode: "PERF-001",
      clientName: "Client Reviewer",
      location: "Metro Manila",
      currencyCode: "PHP",
      coverImageUrl: "/shared-link/perf-cover.jpg",
    },
    estimates: [
      {
        id: "estimate-perf",
        name: "Large proposal package",
        sheetCode: "PERF-EST",
        updatedAt: "2026-06-21T00:00:00.000Z",
        tabs: [{ id: "tab-main", name: "Main", sortOrder: 0, isDefault: true }],
        nodes,
        rows: Array.from({ length: rowCount }, (_, index) => ({
          id: `row-${String(index + 1).padStart(5, "0")}`,
          description: `Performance fixture line item ${index + 1}`,
          designation: `P-${String(index + 1).padStart(5, "0")}`,
          discipline: index % 3 === 0 ? "Architectural" : index % 3 === 1 ? "Electrical" : "Structural",
          material: `Material package ${index + 1}`,
          quantity: (index % 25) + 1,
          unit: index % 2 === 0 ? "lot" : "sqm",
          unitCost: 1500 + (index % 20) * 125,
          miscCost: index % 5 === 0 ? 500 : 0,
          contingencyPercentage: index % 4,
          imageUrl: index % 20 === 0 ? `/component-thumbnails/perf-${index % 5}.jpg` : null,
          nodeId: `node-${(index % nodes.length) + 1}`,
        })),
      },
    ],
  };
}

function measureSnapshotBytes(rowCount: number) {
  const snapshot = buildProjectPublicationSnapshot(makeSnapshotFixture(rowCount));
  return Buffer.byteLength(JSON.stringify(snapshot), "utf8");
}

async function measureRecipientSessionTti() {
  const shareUrl = process.env.SHARE_URL;
  if (!shareUrl) throw new Error("SHARE_URL is required for --mode recipient-session-tti.");
  const startedAt = performance.now();
  const response = await fetch(shareUrl, { redirect: "follow" });
  await response.arrayBuffer();
  if (!response.ok) throw new Error(`SHARE_URL returned HTTP ${response.status}`);
  return performance.now() - startedAt;
}

async function measurePasswordUnlock() {
  const password = "client-review-passphrase";
  const hash = await hashPublicationPassword(password, { saltBytes: () => Buffer.alloc(16, 7) });
  const startedAt = performance.now();
  const ok = await verifyPublicationPassword(password, hash);
  if (!ok) throw new Error("Local password verification fixture failed.");
  return performance.now() - startedAt;
}

function measureRotateCost(recipientCount: number) {
  const startedAt = performance.now();
  for (let index = 0; index < recipientCount; index += 1) {
    hashPublicationToken(createPublicationToken({ bytes: 24 }), DEFAULT_SECRET);
  }
  return performance.now() - startedAt;
}

async function collectSamples(mode: Mode, rowsN: number, samples: number) {
  const values: number[] = [];
  for (let sample = 0; sample < samples; sample += 1) {
    if (mode === "snapshot-bytes") values.push(measureSnapshotBytes(rowsN));
    else if (mode === "recipient-session-tti") values.push(await measureRecipientSessionTti());
    else if (mode === "password-unlock") values.push(await measurePasswordUnlock());
    else values.push(measureRotateCost(rowsN));
  }
  return values;
}

function budgetFor(mode: Mode, rowsN: number) {
  if (mode === "snapshot-bytes") return { budget: bytesBudget(rowsN), unit: "bytes" as const };
  if (mode === "recipient-session-tti") return { budget: 2500, unit: "ms" as const };
  if (mode === "password-unlock") return { budget: 500, unit: "ms" as const };
  return { budget: rotateBudgetMs(rowsN), unit: "ms" as const };
}

function fixtureLabel(mode: Mode) {
  if (mode === "snapshot-bytes") return "local-synthetic-tabbed-snapshot";
  if (mode === "recipient-session-tti") return "hosted-share-url-route-request";
  if (mode === "password-unlock") return "local-scrypt-verify-only";
  return "local-token-hash-loop-no-db-lock";
}

export async function runPerfBudgetMeasurement(options: CliOptions): Promise<MeasurementRow[]> {
  const date = nowDate();
  const sha = gitSha();
  const rows: MeasurementRow[] = [];

  for (const rowsN of options.rows) {
    const samples = await collectSamples(options.mode, rowsN, options.samples);
    const { budget, unit } = budgetFor(options.mode, rowsN);
    const p50 = percentile(samples, 0.5);
    const p95 = percentile(samples, 0.95);
    rows.push({
      date,
      gitSha: sha,
      env: options.mode === "recipient-session-tti" ? "hosted" : "local",
      fixture: fixtureLabel(options.mode),
      mode: options.mode,
      rowsN,
      samples: options.samples,
      p50,
      p95,
      unit,
      budget,
      status: p95 <= budget ? "PASS" : "FAIL",
      note:
        options.mode === "snapshot-bytes"
          ? "Measures current snapshot JSON shape; v1.3 keeps estimate rows and stores tab row IDs."
          : options.mode === "rotate-cost"
            ? "CPU-only token hash loop; provider lock/update cost still requires Supabase evidence."
            : options.mode === "password-unlock"
              ? "CPU-only scrypt verify; route DB writes/backoff still require hosted evidence."
              : "Hosted GET timing only; browser TTI and recipient POST/reload still require synthetic proof.",
    });
  }

  return rows;
}

function renderValue(value: number, unit: MeasurementRow["unit"]) {
  if (unit === "bytes") {
    const kib = value / 1024;
    const mib = value / 1024 / 1024;
    return mib >= 1 ? `${value} bytes (${mib.toFixed(2)} MiB)` : `${value} bytes (${kib.toFixed(1)} KiB)`;
  }
  return `${value.toFixed(2)} ms`;
}

export function renderMeasurementRowsForMarkdown(rows: MeasurementRow[]) {
  return rows
    .map(
      (row) =>
        `| ${row.date} | ${row.gitSha} | ${row.env} | ${row.fixture} | ${row.mode} | ${row.rowsN} | ${row.samples} | ${renderValue(row.p50, row.unit)} | ${renderValue(row.p95, row.unit)} | ${renderValue(row.budget, row.unit)} | **${row.status}** | ${row.note} |`,
    )
    .join("\n");
}

function readExistingMeasurementRows(outFile: string) {
  if (!existsSync(outFile)) return [];
  return readFileSync(outFile, "utf8")
    .split("\n")
    .filter((line) => line.startsWith("| ") && !line.startsWith("| Date ") && !line.startsWith("| --- "));
}

function writeMarkdown(rows: MeasurementRow[], outFile: string, append: boolean) {
  const resolved = resolve(outFile);
  const existingRows = append ? readExistingMeasurementRows(resolved) : [];
  const table = [...existingRows, renderMeasurementRowsForMarkdown(rows)].filter(Boolean).join("\n");
  const markdown = `# Shared-link performance budgets\n\nStatus: **MEASURED LOCAL/PARTIAL EVIDENCE**. A failed row below keeps the feature ship gate open; hosted Supabase/browser evidence remains separate unless the row explicitly says hosted.\n\n| Date | Git SHA | Env | Fixture | Mode | rows/N | Samples | p50 | p95 | Budget | PASS/FAIL | Notes |\n| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- |\n${table}\n`;
  mkdirSync(dirname(resolved), { recursive: true });
  writeFileSync(resolved, markdown);
}

async function main() {
  const options = parseArgs();
  const rows = await runPerfBudgetMeasurement(options);
  writeMarkdown(rows, options.out, options.append);
  for (const row of rows) {
    console.log(`${row.mode} rows/N=${row.rowsN}: p95=${renderValue(row.p95, row.unit)} budget=${renderValue(row.budget, row.unit)} ${row.status}`);
  }
  console.log(`Wrote perf budget markdown: ${resolve(options.out)}`);
}

if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
