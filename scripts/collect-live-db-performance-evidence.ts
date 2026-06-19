#!/usr/bin/env bun

// Safe orchestrator for live/staging DB performance evidence collection.
//
// Purpose:
//   - Run the existing repo-static query/index inventories.
//   - Optionally collect read-only live evidence (row counts, table sizes,
//     index usage, pg_stat_statements, unindexed FKs).
//   - Emit a markdown report that labels the proof boundary.
//   - Refuse to create index migrations or RPC rewrites from static-only evidence.
//
// Modes:
//   static (default) - repo-only; no provider credentials required.
//   linked           - read-only evidence via `supabase db query --linked`.
//   local            - read-only evidence via `psql` against DATABASE_URL.
//
// Guardrails:
//   - Never writes files under supabase/migrations/.
//   - Never emits CREATE INDEX / CREATE OR REPLACE FUNCTION statements.
//   - Live SQL is SELECT-only against system/catalog views.
//   - Secrets (DATABASE_URL, tokens) are never printed.

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { parseArgs } from "node:util";

type Mode = "static" | "linked" | "local";
type ProofBoundary = "repo-static" | "linked-provider" | "local-only" | "manual-proof-pending";

type EvidenceReport = {
  generatedAt: string;
  mode: Mode;
  proofBoundary: ProofBoundary;
  repoInventoryPath: string;
  repoAuditPath: string;
  liveEvidence: {
    available: boolean;
    target: string;
    prerequisiteErrors: string[];
    artifacts: string[];
  };
  nextSteps: string[];
};

const ALLOWED_SUPABASE_PROJECT_REF = "ebxxqidacheyapmmzavr";

const USAGE = `Usage: bun run scripts/collect-live-db-performance-evidence.ts [options]

Options:
  --mode static|linked|local   Evidence mode (default: static)
  --output-dir <path>          Directory for evidence artifacts
  --run-sql                    Attempt to execute live SQL when mode is linked/local
  --help                       Show this help

Modes:
  static  - repo-only inventory; no provider credentials required.
  linked  - read-only evidence from a linked Supabase project via supabase db query.
  local   - read-only evidence from a local Postgres via psql and DATABASE_URL.

Environment:
  DATABASE_URL                 Postgres connection string (required for --mode local).
  SUPABASE_PROJECT_ID          Supabase project ref (optional; used for linked mode logging only).

Guardrails:
  - This script never writes migration or RPC rewrite files.
  - Static mode explicitly refuses to propose indexes or rewrites.
  - Live modes run only SELECT/read-only SQL.
`;

const LIVE_EVIDENCE_SQL = `-- Live DB performance evidence collection.
-- Read-only and compatible with both Supabase Management API db query and psql.
-- The result is one row with JSON arrays so db query does not discard earlier
-- result sets. pg_stat_statements is intentionally reported as availability only;
-- query text capture should happen in a controlled follow-up environment.

with
table_rows as (
  select schemaname, relname as table_name, n_live_tup as row_count
  from pg_stat_user_tables
  where schemaname = 'public'
),
table_sizes as (
  select
    schemaname,
    relname as table_name,
    pg_total_relation_size(format('%I.%I', schemaname, relname)::regclass) as total_size_bytes,
    pg_size_pretty(pg_total_relation_size(format('%I.%I', schemaname, relname)::regclass)) as total_size
  from pg_stat_user_tables
  where schemaname = 'public'
),
index_usage as (
  select schemaname, relname as table_name, indexrelname as index_name, idx_scan, idx_tup_read, idx_tup_fetch
  from pg_stat_user_indexes
  where schemaname = 'public'
),
unindexed_foreign_keys as (
  select tc.table_name, kcu.column_name
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name
   and tc.table_schema = kcu.table_schema
  where tc.constraint_type = 'FOREIGN KEY'
    and tc.table_schema = 'public'
    and not exists (
      select 1
      from pg_indexes pi
      where pi.schemaname = 'public'
        and pi.tablename = tc.table_name
        and pi.indexdef ilike '%(' || kcu.column_name || '%'
    )
)
select
  now() as collected_at,
  current_database() as database_name,
  (to_regclass('public.pg_stat_statements') is not null) as has_pg_stat_statements,
  coalesce((select jsonb_agg(to_jsonb(table_rows) order by row_count desc, table_name) from table_rows), '[]'::jsonb) as table_rows,
  coalesce((select jsonb_agg(to_jsonb(table_sizes) order by total_size_bytes desc, table_name) from table_sizes), '[]'::jsonb) as table_sizes,
  coalesce((select jsonb_agg(to_jsonb(index_usage) order by idx_scan desc, index_name) from index_usage), '[]'::jsonb) as index_usage,
  coalesce((select jsonb_agg(to_jsonb(unindexed_foreign_keys) order by table_name, column_name) from unindexed_foreign_keys), '[]'::jsonb) as unindexed_foreign_keys;
`;

function main() {
  const { values } = parseArgs({
    options: {
      mode: { type: "string", default: "static" },
      "output-dir": { type: "string" },
      "run-sql": { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
    strict: true,
    allowPositionals: true,
  });

  if (values.help) {
    console.log(USAGE);
    process.exit(0);
  }

  const mode = values.mode as Mode;
  if (!["static", "linked", "local"].includes(mode)) {
    console.error(`Invalid mode: ${mode}`);
    console.error(USAGE);
    process.exit(1);
  }

  const today = new Date().toISOString().slice(0, 10);
  const outputDir = resolve(values["output-dir"] ?? `.ai/09_archive/store/${today}-live-db-performance-evidence`);
  mkdirSync(outputDir, { recursive: true });

  console.log(`Collecting DB performance evidence in ${mode} mode...`);
  console.log(`Output directory: ${relative(process.cwd(), outputDir)}`);

  // 1. Repo-static inventories (always run)
  const inventoryMarkdown = join(outputDir, "query-inventory.md");
  const auditMarkdown = join(outputDir, "query-index-audit.md");

  runRepoCommand("bun", ["run", "scripts/build-performance-query-inventory.ts"], { MARKDOWN_FILE: inventoryMarkdown });
  runRepoCommand("bun", ["run", "scripts/audit-dbidx-repo.ts"], { OUTPUT_FILE: auditMarkdown });

  // 2. Live evidence (optional, guarded)
  const liveEvidence = collectLiveEvidence(mode, outputDir, values["run-sql"] ?? false);

  // 3. Build and write report
  const proofBoundary = deriveProofBoundary(mode, liveEvidence);
  const report: EvidenceReport = {
    generatedAt: new Date().toISOString(),
    mode,
    proofBoundary,
    repoInventoryPath: relative(process.cwd(), inventoryMarkdown),
    repoAuditPath: relative(process.cwd(), auditMarkdown),
    liveEvidence,
    nextSteps: deriveNextSteps(mode, liveEvidence),
  };

  const reportPath = join(outputDir, "evidence-report.md");
  writeFileSync(reportPath, renderReport(report));
  console.log(`Wrote evidence report: ${relative(process.cwd(), reportPath)}`);

  // 4. Guardrail messaging
  if (mode === "static") {
    console.log("\n⚠️  GUARDRAIL: Static-only evidence. Do not create index migrations or RPC rewrites from this artifact.");
  } else if (!liveEvidence.available) {
    console.log("\n⚠️  GUARDRAIL: Live evidence prerequisites were not met. Do not create index migrations or RPC rewrites.");
  } else {
    console.log("\n✅ Live evidence collected. Review the report before any index/RPC proposals.");
  }

  if (liveEvidence.prerequisiteErrors.length > 0) {
    console.error("\nPrerequisite errors:");
    for (const err of liveEvidence.prerequisiteErrors) console.error(`  - ${err}`);
    process.exit(2);
  }
}

function runRepoCommand(command: string, args: string[], env: Record<string, string>) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    env: { ...process.env, ...env },
    stdio: "pipe",
  });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}\n${result.stdout}\n${result.stderr}`);
  }
  const stdout = result.stdout.trim();
  if (stdout) console.log(stdout);
}

function which(command: string): string | undefined {
  const pathEnv = process.env.PATH ?? "";
  for (const dir of pathEnv.split(":")) {
    const candidate = join(dir, command);
    if (existsSync(candidate)) return candidate;
  }
  return undefined;
}

function collectLiveEvidence(mode: Mode, outputDir: string, runSql: boolean): EvidenceReport["liveEvidence"] {
  const errors: string[] = [];
  const artifacts: string[] = [];
  const liveEvidence: EvidenceReport["liveEvidence"] = {
    available: false,
    target: "none",
    prerequisiteErrors: errors,
    artifacts,
  };

  if (mode === "static") {
    return liveEvidence;
  }

  // Always write the SQL template so humans can run it manually.
  const sqlPath = join(outputDir, "live-evidence.sql");
  writeFileSync(sqlPath, LIVE_EVIDENCE_SQL);
  artifacts.push(relative(process.cwd(), sqlPath));

  liveEvidence.target = mode === "linked" ? "linked Supabase project" : "local Postgres (DATABASE_URL)";

  if (mode === "linked") {
    const supabaseCli = which("supabase");
    if (!supabaseCli) {
      errors.push("supabase CLI not found in PATH.");
      return liveEvidence;
    }

    if (!runSql) {
      errors.push("--run-sql not set; generated live-evidence.sql for manual execution.");
      return liveEvidence;
    }

    const linkedProjectRef = readLinkedProjectRef();
    if (!linkedProjectRef) {
      errors.push(`Unable to prove linked Supabase project ref; expected ${ALLOWED_SUPABASE_PROJECT_REF}.`);
      return liveEvidence;
    }
    if (linkedProjectRef !== ALLOWED_SUPABASE_PROJECT_REF) {
      errors.push(`Refusing linked SQL against project ${linkedProjectRef}; expected ${ALLOWED_SUPABASE_PROJECT_REF}.`);
      return liveEvidence;
    }

    const envProjectRef = process.env.SUPABASE_PROJECT_ID?.trim();
    if (envProjectRef && envProjectRef !== ALLOWED_SUPABASE_PROJECT_REF) {
      errors.push(`SUPABASE_PROJECT_ID is ${envProjectRef}; expected ${ALLOWED_SUPABASE_PROJECT_REF}.`);
      return liveEvidence;
    }

    liveEvidence.target = `linked Supabase project ${linkedProjectRef}`;
    console.log(`Attempting read-only query against project ${linkedProjectRef}...`);

    const result = runLinkedSql(LIVE_EVIDENCE_SQL);
    if (result.ok) {
      const rawPath = join(outputDir, "live-evidence-raw.json");
      writeFileSync(rawPath, result.output);
      artifacts.push(relative(process.cwd(), rawPath));
      liveEvidence.available = true;
    } else {
      errors.push(result.error);
    }
    return liveEvidence;
  }

  if (mode === "local") {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      errors.push("DATABASE_URL environment variable is required for --mode local.");
      return liveEvidence;
    }

    const psqlPath = which("psql");
    if (!psqlPath) {
      errors.push("psql not found in PATH.");
      return liveEvidence;
    }

    if (!runSql) {
      errors.push("--run-sql not set; generated live-evidence.sql for manual execution.");
      return liveEvidence;
    }

    console.log("Attempting read-only query against local Postgres...");
    const result = runPsqlSql(databaseUrl, LIVE_EVIDENCE_SQL);
    if (result.ok) {
      const rawPath = join(outputDir, "live-evidence-raw.json");
      writeFileSync(rawPath, result.output);
      artifacts.push(relative(process.cwd(), rawPath));
      liveEvidence.available = true;
    } else {
      errors.push(result.error);
    }
    return liveEvidence;
  }

  return liveEvidence;
}

function runLinkedSql(sql: string): { ok: true; output: string } | { ok: false; error: string } {
  const tempSql = join(tmpdir(), `archestimator-live-evidence-${Date.now()}.sql`);
  mkdirSync(dirname(tempSql), { recursive: true });
  writeFileSync(tempSql, sql);

  try {
    const result = spawnSync("supabase", ["db", "query", "--linked", "--file", tempSql, "--output", "json"], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: { ...process.env, LC_ALL: "C" },
      stdio: "pipe",
    });
    if (result.status !== 0) {
      return { ok: false, error: `supabase db query failed:\n${redactSensitive(result.stderr || result.stdout)}` };
    }
    return { ok: true, output: result.stdout };
  } finally {
    try {
      // Best-effort cleanup; do not fail if temp file was removed externally.
      if (existsSync(tempSql)) rmSync(tempSql);
    } catch {
      // ignore cleanup failures
    }
  }
}

function runPsqlSql(databaseUrl: string, sql: string): { ok: true; output: string } | { ok: false; error: string } {
  let postgresEnv: Record<string, string>;
  try {
    postgresEnv = databaseUrlToPsqlEnv(databaseUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: `Invalid DATABASE_URL: ${message}` };
  }

  const result = spawnSync("psql", ["-v", "ON_ERROR_STOP=1", "-f", "-"], {
    cwd: process.cwd(),
    encoding: "utf8",
    input: sql,
    env: { ...process.env, LC_ALL: "C", ...postgresEnv },
    stdio: ["pipe", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    return { ok: false, error: `psql failed:\n${redactSensitive(result.stderr || result.stdout)}` };
  }
  return { ok: true, output: result.stdout };
}

function readLinkedProjectRef(): string | null {
  const projectRefPath = join(process.cwd(), "supabase/.temp/project-ref");
  const linkedProjectPath = join(process.cwd(), "supabase/.temp/linked-project.json");

  try {
    if (existsSync(projectRefPath)) {
      const value = readFileSync(projectRefPath, "utf8").trim();
      if (value) return value;
    }
  } catch {
    // Fall through to linked-project.json.
  }

  try {
    if (existsSync(linkedProjectPath)) {
      const parsed = JSON.parse(readFileSync(linkedProjectPath, "utf8")) as unknown;
      if (parsed && typeof parsed === "object" && "project_ref" in parsed) {
        const value = (parsed as { project_ref?: unknown }).project_ref;
        if (typeof value === "string" && value.trim()) return value.trim();
      }
      if (parsed && typeof parsed === "object" && "ref" in parsed) {
        const value = (parsed as { ref?: unknown }).ref;
        if (typeof value === "string" && value.trim()) return value.trim();
      }
    }
  } catch {
    return null;
  }

  return null;
}

function databaseUrlToPsqlEnv(databaseUrl: string): Record<string, string> {
  const parsed = new URL(databaseUrl);
  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    throw new Error(`unsupported protocol ${parsed.protocol}`);
  }

  const env: Record<string, string> = {};
  if (parsed.hostname) env.PGHOST = parsed.hostname;
  if (parsed.port) env.PGPORT = parsed.port;
  if (parsed.username) env.PGUSER = decodeURIComponent(parsed.username);
  if (parsed.password) env.PGPASSWORD = decodeURIComponent(parsed.password);

  const database = parsed.pathname.replace(/^\//, "");
  if (database) env.PGDATABASE = decodeURIComponent(database);

  const sslMode = parsed.searchParams.get("sslmode");
  if (sslMode) env.PGSSLMODE = sslMode;

  return env;
}

function redactSensitive(text: string): string {
  return text
    .replace(/postgres(?:ql)?:\/\/[^\s"')]+/gi, "postgres://[redacted]")
    .replace(/(PGPASSWORD=)[^\s"')]+/gi, "$1[redacted]")
    .replace(/:\/\/([^:\s/@]+):([^@\s/]+)@/g, "://$1:[redacted]@");
}

function deriveProofBoundary(mode: Mode, liveEvidence: EvidenceReport["liveEvidence"]): ProofBoundary {
  if (mode === "static") return "repo-static";
  if (liveEvidence.available) return mode === "linked" ? "linked-provider" : "local-only";
  return "manual-proof-pending";
}

function deriveNextSteps(mode: Mode, liveEvidence: EvidenceReport["liveEvidence"]): string[] {
  const steps: string[] = [];
  if (mode === "static") {
    steps.push("Re-run with --mode linked --run-sql against a staging Supabase project when credentials/linking are available.");
    steps.push("Re-run with --mode local --run-sql when a representative local Postgres seed database is ready.");
    steps.push("Do not author index migrations until live EXPLAIN and row-count evidence exist.");
    return steps;
  }
  if (!liveEvidence.available) {
    steps.push("Resolve prerequisite errors listed above, then re-run with --run-sql.");
    steps.push("If linked/local execution is permanently unavailable, use the generated live-evidence.sql in a controlled environment and import the results.");
    return steps;
  }
  steps.push("Review live-evidence-raw.json for high-cost queries and missing indexes.");
  steps.push("Capture EXPLAIN plans for specific queries identified in the repo inventory before proposing indexes.");
  steps.push("Validate candidate indexes on a representative staging copy before writing migrations.");
  return steps;
}

function renderReport(report: EvidenceReport): string {
  const proofBoundaryLabel = report.proofBoundary;
  const guardrailNote = report.mode === "static" || !report.liveEvidence.available
    ? "**MIGRATION GUARDRAIL ACTIVE:** This evidence is not sufficient to create index migrations or RPC rewrites."
    : "**MIGRATION GUARDRAIL REMINDER:** Live evidence is required before any index migration or RPC rewrite proposal.";

  return `# Live DB Performance Evidence Report

**Generated:** ${report.generatedAt}
**Mode:** ${report.mode}
**Proof boundary:** ${proofBoundaryLabel}

${guardrailNote}

## Repo-static artifacts

- Query inventory: \`${report.repoInventoryPath}\`
- Query/index audit: \`${report.repoAuditPath}\`

## Live evidence target

- Target: ${report.liveEvidence.target}
- Available: ${report.liveEvidence.available ? "yes" : "no"}
- Artifacts: ${report.liveEvidence.artifacts.map((a) => `\`${a}\``).join(", ") || "none"}

## Prerequisite errors

${report.liveEvidence.prerequisiteErrors.length
    ? report.liveEvidence.prerequisiteErrors.map((e) => `- ${e}`).join("\n")
    : "None."}

## What this evidence proves

| Boundary | Meaning |
| --- | --- |
| repo-static | Source-only inventory; no runtime behavior, no provider metrics. |
| linked-provider | Read-only SQL ran against a linked Supabase project. |
| local-only | Read-only SQL ran against a local Postgres instance. |
| manual-proof-pending | Live SQL was generated but not executed; human/provider run required. |

## Next steps

${report.nextSteps.map((s) => `- ${s}`).join("\n")}

## Non-goals enforced

- No index migration was created.
- No RPC rewrite was created.
- No provider secret or connection string was printed.
`;
}

if (import.meta.main) main();
