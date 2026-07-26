#!/usr/bin/env bun

import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

import { runLocalSqliteCli } from "./lib/local-sqlite-proof";

type QueryBenchmarkRow = {
  surface: string;
  queryBudget: number;
  plannedQueries: number;
  localBudgetMs: number;
  localP95Ms: number;
  sampleCount: number;
  rowsReturned: number;
  status: "local-pass" | "local-fail";
  notes: string;
};

type LocalPerformanceBenchmark = {
  sqliteVersion: string;
  fixtureTables: number;
  benchmarkSurfaces: number;
  rowsSeeded: number;
  tempArtifactsRemoved: boolean;
  rows: QueryBenchmarkRow[];
};

type HostedQueryBenchmarkRow = {
  surface?: string;
  queryBudget?: number;
  plannedQueries?: number;
  hostedBudgetMs?: number;
  hostedP95Ms?: number;
  sampleCount?: number;
  rowsReturned?: number;
  status?: string;
  notes?: string;
};

type HostedD1RuntimePerformanceProof = {
  providerBacked?: boolean;
  result?: {
    schemaReady?: boolean;
    seedReady?: boolean;
    cleanupReady?: boolean;
    rowsSeeded?: number;
    rowsCleaned?: number | null;
    benchmarkRows?: HostedQueryBenchmarkRow[];
  } | null;
  readiness?: {
    queryCountBudgetsReady?: boolean;
    hostedP95Ready?: boolean;
    hostedWorkerD1PerformanceReady?: boolean;
    d1RuntimeProofReady?: boolean;
  };
  blockers?: string[];
};

type PerformanceProofInputs = {
  generatedAt?: string;
  benchmark?: LocalPerformanceBenchmark;
  hostedD1RuntimePerformanceProof?: HostedD1RuntimePerformanceProof | null;
  hostedD1RuntimePerformanceProofSource?: string | null;
};

export type CloudflareD1PerformanceProofReport = {
  generatedAt: string;
  mode: "cloudflare-d1-performance-proof";
  sources: {
    plan: string;
    localFixture: string;
    hostedD1RuntimePerformanceProof: string | null;
  };
  queryCountBudgetsReady: boolean;
  p95RouteProofReady: boolean;
  hostedWorkerD1PerformanceReady: boolean;
  localOnly: boolean;
  providerBacked: boolean;
  benchmark: LocalPerformanceBenchmark;
  hostedBenchmark: {
    source: string | null;
    schemaReady: boolean;
    seedReady: boolean;
    cleanupReady: boolean;
    rowsSeeded: number | null;
    rowsCleaned: number | null;
    rows: HostedQueryBenchmarkRow[];
  } | null;
  hostedProofRequirements: string[];
  blockers: string[];
  note: string;
};

const PLAN_ROOT = ".ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence";
const DEFAULT_HOSTED_D1_RUNTIME_PERFORMANCE_PROOF_FILE = `${PLAN_ROOT}/2026-06-30-cloudflare-d1-runtime-performance-proof.json`;

const FIXTURE_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL
);

CREATE TABLE workspace_members (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  PRIMARY KEY (workspace_id, user_id)
);

CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL
);

CREATE TABLE estimates (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  total_cents INTEGER NOT NULL
);

CREATE TABLE estimate_rows (
  id TEXT PRIMARY KEY,
  estimate_id TEXT NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity REAL NOT NULL,
  unit_cost_cents INTEGER NOT NULL
);

CREATE TABLE library_components (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  unit_cost_cents INTEGER NOT NULL
);

CREATE INDEX idx_projects_workspace_status ON projects(workspace_id, status);
CREATE INDEX idx_workspace_members_lookup ON workspace_members(workspace_id, user_id, role);
CREATE INDEX idx_estimates_project ON estimates(project_id);
CREATE INDEX idx_estimate_rows_estimate ON estimate_rows(estimate_id);
CREATE INDEX idx_library_components_workspace_category ON library_components(workspace_id, category);

INSERT INTO workspaces (id, slug, name) VALUES
  ('ws-alpha', 'alpha', 'Alpha Workshop'),
  ('ws-beta', 'beta', 'Beta Workshop');

INSERT INTO workspace_members (workspace_id, user_id, role) VALUES
  ('ws-alpha', 'user-owner', 'owner'),
  ('ws-alpha', 'user-editor', 'editor'),
  ('ws-alpha', 'user-viewer', 'viewer'),
  ('ws-beta', 'user-owner', 'owner');

WITH RECURSIVE project_numbers(i) AS (
  VALUES(1)
  UNION ALL
  SELECT i + 1 FROM project_numbers WHERE i < 6
)
INSERT INTO projects (id, workspace_id, name, status)
SELECT
  'project-alpha-' || i,
  'ws-alpha',
  'Alpha Project ' || i,
  CASE WHEN i % 3 = 0 THEN 'archived' ELSE 'active' END
FROM project_numbers;

WITH RECURSIVE estimate_numbers(i) AS (
  VALUES(1)
  UNION ALL
  SELECT i + 1 FROM estimate_numbers WHERE i < 12
)
INSERT INTO estimates (id, project_id, name, total_cents)
SELECT
  'estimate-alpha-' || i,
  'project-alpha-' || (((i - 1) % 6) + 1),
  'Estimate ' || i,
  100000 + (i * 12500)
FROM estimate_numbers;

WITH RECURSIVE row_numbers(i) AS (
  VALUES(1)
  UNION ALL
  SELECT i + 1 FROM row_numbers WHERE i < 72
)
INSERT INTO estimate_rows (id, estimate_id, description, quantity, unit_cost_cents)
SELECT
  'row-alpha-' || i,
  'estimate-alpha-' || (((i - 1) % 12) + 1),
  'Line item ' || i,
  1 + (i % 7),
  2500 + (i * 35)
FROM row_numbers;

WITH RECURSIVE component_numbers(i) AS (
  VALUES(1)
  UNION ALL
  SELECT i + 1 FROM component_numbers WHERE i < 36
)
INSERT INTO library_components (id, workspace_id, category, name, unit_cost_cents)
SELECT
  'component-alpha-' || i,
  'ws-alpha',
  CASE WHEN i % 3 = 0 THEN 'finish' WHEN i % 3 = 1 THEN 'rough' ELSE 'fixture' END,
  'Component ' || i,
  1000 + (i * 45)
FROM component_numbers;
`;

const QUERY_SPECS = [
  {
    surface: "workspace_homebase_summary",
    queryBudget: 3,
    plannedQueries: 1,
    localBudgetMs: 150,
    sql: `
      SELECT p.status, COUNT(DISTINCT p.id) AS project_count, COALESCE(SUM(e.total_cents), 0) AS total_cents
      FROM projects p
      LEFT JOIN estimates e ON e.project_id = p.id
      WHERE p.workspace_id = 'ws-alpha'
      GROUP BY p.status
      ORDER BY p.status;
    `,
    notes: "Workspace summary read model should stay within one grouped D1 query plus authorization guard.",
  },
  {
    surface: "project_estimate_list_summaries",
    queryBudget: 3,
    plannedQueries: 1,
    localBudgetMs: 150,
    sql: `
      SELECT e.id, e.name, COUNT(r.id) AS row_count, COALESCE(SUM(r.quantity * r.unit_cost_cents), 0) AS rows_total_cents
      FROM estimates e
      LEFT JOIN estimate_rows r ON r.estimate_id = e.id
      WHERE e.project_id = 'project-alpha-1'
      GROUP BY e.id, e.name
      ORDER BY e.id;
    `,
    notes: "Project estimate list should avoid per-estimate follow-up queries.",
  },
  {
    surface: "library_overview_summary",
    queryBudget: 3,
    plannedQueries: 1,
    localBudgetMs: 150,
    sql: `
      SELECT category, COUNT(*) AS component_count, ROUND(AVG(unit_cost_cents), 2) AS avg_unit_cost_cents
      FROM library_components
      WHERE workspace_id = 'ws-alpha'
      GROUP BY category
      ORDER BY category;
    `,
    notes: "Library overview should stay as a grouped indexed read-model query.",
  },
  {
    surface: "can_edit_project",
    queryBudget: 2,
    plannedQueries: 1,
    localBudgetMs: 150,
    sql: `
      SELECT EXISTS (
        SELECT 1
        FROM projects p
        JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
        WHERE p.id = 'project-alpha-1'
          AND wm.user_id = 'user-owner'
          AND wm.role IN ('owner', 'editor')
      ) AS allowed;
    `,
    notes: "Authorization guard should stay as one indexed membership lookup.",
  },
  {
    surface: "estimate_row_mutation",
    queryBudget: 3,
    plannedQueries: 1,
    localBudgetMs: 150,
    sql: `
      UPDATE estimate_rows
      SET quantity = 4, unit_cost_cents = unit_cost_cents + 1
      WHERE id = 'row-alpha-1'
      RETURNING quantity, unit_cost_cents;
    `,
    notes: "Estimate row mutation should stay as one indexed D1 update against an authorized proof row.",
  },
] as const;

const HOSTED_PROOF_REQUIREMENTS = [
  "Run the same route/action surfaces against a deployed Cloudflare Worker bound to a hosted D1 database.",
  "Capture p50/p95 duration, query count, rows returned, errors, and Cloudflare Worker CPU/duration/subrequest metrics.",
  "Compare hosted D1 numbers with the accepted current-provider baseline before cutover.",
  "Keep protected routes no-store and preserve authorization checks during performance proof.",
];

function readEnv(name: string) {
  const value = process.env[name];
  return value?.trim() || undefined;
}

function readJsonIfExists<T>(file: string | undefined | null) {
  if (!file) return { source: null as string | null, value: null as T | null };
  if (!existsSync(file)) return { source: file, value: null as T | null };
  return { source: file, value: JSON.parse(readFileSync(file, "utf8")) as T };
}

function runSqlite(args: string[], input?: string) {
  const result = runLocalSqliteCli(args, input);
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = result.stderr.trim() || result.stdout.trim() || `exit ${result.status}`;
    throw new Error(`SQLite ${args.join(" ")} failed: ${detail}`);
  }
  return result.stdout;
}

function runSqliteScript(databasePath: string, sql: string) {
  runSqlite([databasePath], sql);
}

function runSqliteJson<T>(databasePath: string, sql: string) {
  const output = runSqlite(["-json", databasePath, sql]).trim();
  return output ? JSON.parse(output) as T[] : [];
}

function sqliteVersion() {
  return runSqlite(["--version"]).trim().split(/\s+/)[0] ?? "unknown";
}

function percentile(values: number[], percentileValue: number) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * percentileValue) - 1));
  return sorted[index];
}

function roundedMs(value: number) {
  return Math.round(value * 100) / 100;
}

function measureQuery(databasePath: string, sql: string) {
  const samples: number[] = [];
  let rowsReturned = 0;

  for (let index = 0; index < 10; index += 1) {
    const started = process.hrtime.bigint();
    const rows = runSqliteJson<Record<string, unknown>>(databasePath, sql);
    const ended = process.hrtime.bigint();
    if (index > 0) {
      samples.push(Number(ended - started) / 1_000_000);
    }
    rowsReturned = rows.length;
  }

  return {
    p95Ms: roundedMs(percentile(samples, 0.95)),
    sampleCount: samples.length,
    rowsReturned,
  };
}

function countFixtureRows(databasePath: string) {
  const rows = runSqliteJson<{ rows_seeded: number }>(
    databasePath,
    `
      SELECT
        (SELECT COUNT(*) FROM workspaces)
        + (SELECT COUNT(*) FROM workspace_members)
        + (SELECT COUNT(*) FROM projects)
        + (SELECT COUNT(*) FROM estimates)
        + (SELECT COUNT(*) FROM estimate_rows)
        + (SELECT COUNT(*) FROM library_components) AS rows_seeded;
    `,
  );
  return rows[0]?.rows_seeded ?? 0;
}

function buildLocalPerformanceBenchmark(): LocalPerformanceBenchmark {
  const tempDir = mkdtempSync(join(tmpdir(), "archestimator-d1-performance-"));
  const databasePath = join(tempDir, "performance.db");

  try {
    runSqliteScript(databasePath, FIXTURE_SQL);
    const rows = QUERY_SPECS.map((spec): QueryBenchmarkRow => {
      const result = measureQuery(databasePath, spec.sql);
      const status = spec.plannedQueries <= spec.queryBudget && result.p95Ms <= spec.localBudgetMs
        ? "local-pass"
        : "local-fail";
      return {
        surface: spec.surface,
        queryBudget: spec.queryBudget,
        plannedQueries: spec.plannedQueries,
        localBudgetMs: spec.localBudgetMs,
        localP95Ms: result.p95Ms,
        sampleCount: result.sampleCount,
        rowsReturned: result.rowsReturned,
        status,
        notes: spec.notes,
      };
    });
    const rowsSeeded = countFixtureRows(databasePath);
    rmSync(tempDir, { recursive: true, force: true });

    return {
      sqliteVersion: sqliteVersion(),
      fixtureTables: 6,
      benchmarkSurfaces: QUERY_SPECS.length,
      rowsSeeded,
      tempArtifactsRemoved: true,
      rows,
    };
  } catch (error) {
    rmSync(tempDir, { recursive: true, force: true });
    throw error;
  }
}

function hostedProofReady(proof: HostedD1RuntimePerformanceProof | null | undefined) {
  return proof?.providerBacked === true
    && proof.readiness?.queryCountBudgetsReady === true
    && proof.readiness.hostedP95Ready === true
    && proof.readiness.hostedWorkerD1PerformanceReady === true
    && proof.readiness.d1RuntimeProofReady === true;
}

function buildBlockers(
  benchmark: LocalPerformanceBenchmark,
  hostedProof: HostedD1RuntimePerformanceProof | null | undefined,
) {
  const blockers = benchmark.rows
    .filter((row) => row.status !== "local-pass")
    .map((row) => `${row.surface}: plannedQueries=${row.plannedQueries}/${row.queryBudget}, localP95Ms=${row.localP95Ms}/${row.localBudgetMs}`);

  if (!hostedProofReady(hostedProof)) {
    const hostedBlockers = hostedProof?.blockers ?? [];
    if (hostedBlockers.length > 0) {
      blockers.push(...hostedBlockers.map((blocker) => `Hosted D1 runtime proof: ${blocker}`));
    } else {
      blockers.push("Hosted Worker+D1 performance proof is still missing.");
    }
  }
  return blockers;
}

export function buildCloudflareD1PerformanceProof(
  inputs: PerformanceProofInputs = {},
): CloudflareD1PerformanceProofReport {
  const benchmark = inputs.benchmark ?? buildLocalPerformanceBenchmark();
  const hostedProof = inputs.hostedD1RuntimePerformanceProof ?? null;
  const hostedReady = hostedProofReady(hostedProof);
  const queryCountBudgetsReady = benchmark.rows.every((row) => row.plannedQueries <= row.queryBudget);
  const p95RouteProofReady = benchmark.rows.every((row) => row.status === "local-pass");

  return {
    generatedAt: inputs.generatedAt ?? new Date().toISOString(),
    mode: "cloudflare-d1-performance-proof",
    sources: {
      plan: ".ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/24_SUPERFAST_CLOUDFLARE_PERFORMANCE_PLAN.md",
      localFixture: "Temporary in-process SQLite fixture generated by this script from sanitized schema/data constants.",
      hostedD1RuntimePerformanceProof: inputs.hostedD1RuntimePerformanceProofSource ?? null,
    },
    queryCountBudgetsReady,
    p95RouteProofReady,
    hostedWorkerD1PerformanceReady: hostedReady,
    localOnly: !hostedReady,
    providerBacked: hostedReady,
    benchmark,
    hostedBenchmark: hostedProof
      ? {
          source: inputs.hostedD1RuntimePerformanceProofSource ?? null,
          schemaReady: hostedProof.result?.schemaReady === true,
          seedReady: hostedProof.result?.seedReady === true,
          cleanupReady: hostedProof.result?.cleanupReady === true,
          rowsSeeded: typeof hostedProof.result?.rowsSeeded === "number" ? hostedProof.result.rowsSeeded : null,
          rowsCleaned: typeof hostedProof.result?.rowsCleaned === "number" ? hostedProof.result.rowsCleaned : null,
          rows: hostedProof.result?.benchmarkRows ?? [],
        }
      : null,
    hostedProofRequirements: HOSTED_PROOF_REQUIREMENTS,
    blockers: buildBlockers(benchmark, hostedProof),
    note: hostedReady
      ? "D1 performance proof combines a local SQLite query-budget scaffold with hosted Worker+D1 runtime evidence from the deployed proof Worker. It records sanitized rows only and does not make production cutover ready."
      : "Local-only D1 performance scaffold. It runs representative indexed SQLite read-model and authorization queries against sanitized temporary data, records query-budget and local p95 evidence, and removes temp artifacts. It does not read env files, call Cloudflare APIs, create D1 databases, deploy Workers, hit hosted routes, or prove hosted Worker+D1 performance unless a hosted runtime proof artifact is supplied.",
  };
}

function writeOutput(outputFile: string, report: CloudflareD1PerformanceProofReport) {
  const outputPath = resolve(outputFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
}

function markdownRows(rows: string[][]) {
  return rows.map((row) => `| ${row.map((cell) => cell.replaceAll("|", "\\|")).join(" | ")} |`);
}

export function writeMarkdown(report: CloudflareD1PerformanceProofReport, markdownFile: string) {
  const outputPath = resolve(markdownFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  const benchmarkRows = report.benchmark.rows.map((row) => [
    row.surface,
    `${row.plannedQueries}/${row.queryBudget}`,
    `${row.localP95Ms}ms/${row.localBudgetMs}ms`,
    String(row.rowsReturned),
    row.status,
    row.notes,
  ]);
  const blockerLines = report.blockers.length > 0
    ? report.blockers.map((blocker) => `- ${blocker}`)
    : ["- (none)"];
  const hostedRequirementLines = report.hostedProofRequirements.map((item) => `- ${item}`);
  const hostedRows = report.hostedBenchmark?.rows.map((row) => [
    row.surface ?? "",
    `${row.plannedQueries ?? ""}/${row.queryBudget ?? ""}`,
    `${row.hostedP95Ms ?? ""}ms/${row.hostedBudgetMs ?? ""}ms`,
    String(row.sampleCount ?? ""),
    String(row.rowsReturned ?? ""),
    row.status ?? "",
  ]) ?? [];
  const lines = [
    "# Cloudflare D1 Performance Proof",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    report.note,
    "",
    "## Summary",
    "",
    "| Gate | Ready |",
    "| --- | --- |",
    `| Query-count budgets ready | ${report.queryCountBudgetsReady ? "yes" : "no"} |`,
    `| Local p95 route/action proof ready | ${report.p95RouteProofReady ? "yes" : "no"} |`,
    `| Hosted Worker+D1 performance ready | ${report.hostedWorkerD1PerformanceReady ? "yes" : "no"} |`,
    `| Local-only proof | ${report.localOnly ? "yes" : "no"} |`,
    `| Provider-backed D1 proof | ${report.providerBacked ? "yes" : "no"} |`,
    "",
    "## Local Benchmark",
    "",
    "| Item | Value |",
    "| --- | ---: |",
    `| SQLite version | ${report.benchmark.sqliteVersion} |`,
    `| Fixture tables | ${report.benchmark.fixtureTables} |`,
    `| Rows seeded | ${report.benchmark.rowsSeeded} |`,
    `| Benchmark surfaces | ${report.benchmark.benchmarkSurfaces} |`,
    `| Temp artifacts removed | ${report.benchmark.tempArtifactsRemoved ? "yes" : "no"} |`,
    "",
    "## Query Surfaces",
    "",
    "| Surface | Planned/query budget | Local p95/budget | Rows returned | Status | Notes |",
    "| --- | ---: | ---: | ---: | --- | --- |",
    ...markdownRows(benchmarkRows),
    "",
    "## Hosted D1 Runtime Benchmark",
    "",
    `Source: ${report.hostedBenchmark?.source ?? "(missing)"}`,
    "",
    "| Item | Value |",
    "| --- | ---: |",
    `| Schema ready | ${report.hostedBenchmark?.schemaReady === true ? "yes" : "no"} |`,
    `| Seed ready | ${report.hostedBenchmark?.seedReady === true ? "yes" : "no"} |`,
    `| Cleanup ready | ${report.hostedBenchmark?.cleanupReady === true ? "yes" : "no"} |`,
    `| Rows seeded | ${report.hostedBenchmark?.rowsSeeded ?? ""} |`,
    `| Rows cleaned | ${report.hostedBenchmark?.rowsCleaned ?? ""} |`,
    "",
    "| Surface | Planned/query budget | Hosted p95/budget | Samples | Rows returned | Status |",
    "| --- | ---: | ---: | ---: | ---: | --- |",
    ...markdownRows(hostedRows),
    "",
    "## Hosted Proof Requirements",
    "",
    ...hostedRequirementLines,
    "",
    "## Blockers",
    "",
    ...blockerLines,
    "",
  ];
  writeFileSync(outputPath, lines.join("\n"));
}

async function main() {
  const hostedProofFile = readEnv("CLOUDFLARE_D1_RUNTIME_PERFORMANCE_PROOF_FILE")
    ?? DEFAULT_HOSTED_D1_RUNTIME_PERFORMANCE_PROOF_FILE;
  const hostedProof = readJsonIfExists<HostedD1RuntimePerformanceProof>(hostedProofFile);
  const report = buildCloudflareD1PerformanceProof({
    hostedD1RuntimePerformanceProof: hostedProof.value,
    hostedD1RuntimePerformanceProofSource: hostedProof.value ? hostedProof.source : null,
  });
  const outputFile = readEnv("OUTPUT_FILE") ?? `${PLAN_ROOT}/2026-06-30-cloudflare-d1-performance-proof.json`;
  const markdownFile = readEnv("MARKDOWN_FILE") ?? `${PLAN_ROOT}/2026-06-30-cloudflare-d1-performance-proof.md`;
  writeOutput(outputFile, report);
  writeMarkdown(report, markdownFile);
  console.log(JSON.stringify(report, null, 2));
  if (!report.queryCountBudgetsReady || !report.p95RouteProofReady) process.exitCode = 1;
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
