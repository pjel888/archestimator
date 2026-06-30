#!/usr/bin/env bun

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";

const EXPECTED_PROJECT_REF = "ebxxqidacheyapmmzavr";
const DEFAULT_D1_DATABASE = "ARCH_DB";
const DEFAULT_ENV_FILES = [".env.local", ".env", ".dev.vars"] as const;
const EVIDENCE_DIR = ".ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence";
const EVIDENCE_JSON = `${EVIDENCE_DIR}/2026-06-30-cloudflare-d1-beta-feedback-backfill.json`;
const EVIDENCE_MD = `${EVIDENCE_DIR}/2026-06-30-cloudflare-d1-beta-feedback-backfill.md`;

const FEEDBACK_TYPES = new Set(["bug", "confusing_ux", "missing_feature", "export_issue", "estimate_accuracy", "other"]);
const SEVERITIES = new Set(["blocker", "high", "medium", "low"]);
const STATUSES = new Set(["new", "reviewing", "resolved", "archived"]);

type BetaFeedbackRow = {
  created_at: string;
  feedback_type: string;
  id: string;
  message: string;
  metadata_json: unknown;
  page_path: string | null;
  project_id: string | null;
  severity: string;
  status: string;
  updated_at: string;
  user_email: string;
  user_id: string;
  workspace_id: string | null;
};

type CountMap = Record<string, number>;

type BackfillReport = {
  generatedAt: string;
  mode: "cloudflare-d1-beta-feedback-backfill";
  sourceProjectRef: string;
  targetD1Database: string;
  sourceRows: number;
  sourceStatusCounts: CountMap;
  sourceSeverityCounts: CountMap;
  wrangler: {
    args: string[];
    exitCode: number | null;
    signal: NodeJS.Signals | null;
    stdoutBytes: number;
    stderrBytes: number;
    timedOut: boolean;
  };
  readiness: {
    sourceProjectBoundaryReady: boolean;
    upsertSucceeded: boolean;
    d1BackfillReady: boolean;
  };
  blockers: string[];
  note: string;
};

function unquoteEnvValue(value: string) {
  const trimmed = value.trim();
  const quote = trimmed[0];
  if ((quote === "\"" || quote === "'") && trimmed.endsWith(quote)) return trimmed.slice(1, -1);
  return trimmed;
}

function loadEnvFiles(files: readonly string[] = DEFAULT_ENV_FILES) {
  for (const file of files) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = trimmed.match(/^(?:export\s+)?([A-Z][A-Z0-9_]+)\s*=\s*(.*)$/);
      if (!match) continue;
      const [, name, rawValue] = match;
      if (!process.env[name]) process.env[name] = unquoteEnvValue(rawValue);
    }
  }
}

function readEnv(name: string) {
  return process.env[name]?.trim() || undefined;
}

function readProjectRef(supabaseUrl: string) {
  const hostname = new URL(supabaseUrl).hostname;
  const [projectRef] = hostname.split(".");
  return projectRef || "";
}

function requireProviderInputs() {
  loadEnvFiles();
  const supabaseUrl = readEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");
  const missing = [
    ["NEXT_PUBLIC_SUPABASE_URL", supabaseUrl],
    ["SUPABASE_SERVICE_ROLE_KEY", serviceRoleKey],
  ].filter(([, value]) => !value).map(([name]) => name);
  if (missing.length > 0) throw new Error(`Missing required environment variable(s): ${missing.join(", ")}.`);

  const projectRef = readProjectRef(supabaseUrl!);
  if (projectRef !== EXPECTED_PROJECT_REF) {
    throw new Error(
      `Refusing beta-feedback D1 backfill; NEXT_PUBLIC_SUPABASE_URL points to project ${projectRef || "unknown"}, expected ${EXPECTED_PROJECT_REF}.`,
    );
  }
  return { projectRef, serviceRoleKey: serviceRoleKey!, supabaseUrl: supabaseUrl! };
}

function sqlValue(value: string | null | undefined) {
  if (value === null || value === undefined) return "NULL";
  return `'${value.replaceAll("'", "''")}'`;
}

function metadataJson(value: unknown) {
  if (value === null || value === undefined) return "{}";
  if (typeof value === "string") {
    try {
      JSON.parse(value);
      return value;
    } catch {
      return JSON.stringify({ value });
    }
  }
  return JSON.stringify(value);
}

function assertRow(row: BetaFeedbackRow, index: number) {
  if (!row.id || !row.user_id || !row.user_email.trim()) throw new Error(`Source row ${index} is missing required identity fields.`);
  if (!FEEDBACK_TYPES.has(row.feedback_type)) throw new Error(`Source row ${index} has unsupported feedback_type ${row.feedback_type}.`);
  if (!SEVERITIES.has(row.severity)) throw new Error(`Source row ${index} has unsupported severity ${row.severity}.`);
  if (!STATUSES.has(row.status)) throw new Error(`Source row ${index} has unsupported status ${row.status}.`);
  if (row.message.trim().length < 10 || row.message.trim().length > 4000) throw new Error(`Source row ${index} has an invalid message length.`);
}

function buildUpsertSql(rows: BetaFeedbackRow[]) {
  return [
    ...rows.map((row, index) => {
      assertRow(row, index);
      return `
INSERT INTO beta_feedback_submissions (
  id,
  user_id,
  workspace_id,
  project_id,
  user_email,
  feedback_type,
  severity,
  page_path,
  message,
  metadata_json,
  status,
  created_at,
  updated_at
) VALUES (
  ${sqlValue(row.id)},
  ${sqlValue(row.user_id)},
  ${sqlValue(row.workspace_id)},
  ${sqlValue(row.project_id)},
  ${sqlValue(row.user_email)},
  ${sqlValue(row.feedback_type)},
  ${sqlValue(row.severity)},
  ${sqlValue(row.page_path)},
  ${sqlValue(row.message)},
  ${sqlValue(metadataJson(row.metadata_json))},
  ${sqlValue(row.status)},
  ${sqlValue(row.created_at)},
  ${sqlValue(row.updated_at)}
)
ON CONFLICT(id) DO UPDATE SET
  user_id = excluded.user_id,
  workspace_id = excluded.workspace_id,
  project_id = excluded.project_id,
  user_email = excluded.user_email,
  feedback_type = excluded.feedback_type,
  severity = excluded.severity,
  page_path = excluded.page_path,
  message = excluded.message,
  metadata_json = excluded.metadata_json,
  status = excluded.status,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at;
`.trim();
    }),
    "",
  ].join("\n\n");
}

function countBy(rows: BetaFeedbackRow[], key: keyof Pick<BetaFeedbackRow, "status" | "severity">) {
  return rows.reduce<CountMap>((counts, row) => {
    const value = row[key];
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

async function readSourceRows() {
  const { projectRef, serviceRoleKey, supabaseUrl } = requireProviderInputs();
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { "X-Client-Info": "archestimator-beta-feedback-d1-backfill" } },
  });

  const rows: BetaFeedbackRow[] = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from("beta_feedback_submissions")
      .select("id, user_id, workspace_id, project_id, user_email, feedback_type, severity, page_path, message, metadata_json, status, created_at, updated_at")
      .order("created_at", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) throw new Error(`Unable to read beta feedback rows: ${error.message || error.code || "unknown error"}.`);
    rows.push(...(data as BetaFeedbackRow[]));
    if (!data || data.length < pageSize) break;
  }

  return { projectRef, rows };
}

function writeEvidence(report: BackfillReport) {
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  writeFileSync(EVIDENCE_JSON, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(
    EVIDENCE_MD,
    [
      "# Cloudflare D1 Beta Feedback Backfill",
      "",
      `Generated: ${report.generatedAt}`,
      "",
      `- Source Supabase project: ${report.sourceProjectRef}`,
      `- Target D1 database: ${report.targetD1Database}`,
      `- Source rows copied: ${report.sourceRows}`,
      `- Source status counts: ${JSON.stringify(report.sourceStatusCounts)}`,
      `- Source severity counts: ${JSON.stringify(report.sourceSeverityCounts)}`,
      `- Wrangler exit code: ${report.wrangler.exitCode}`,
      `- D1 backfill ready: ${report.readiness.d1BackfillReady}`,
      `- Blockers: ${report.blockers.length > 0 ? report.blockers.join("; ") : "none"}`,
      "",
      "No feedback messages, email addresses, or secret values are stored in this evidence file.",
      "",
    ].join("\n"),
  );
}

async function main() {
  const generatedAt = new Date().toISOString();
  const targetD1Database = readEnv("ARCHESTIMATOR_D1_DATABASE") ?? DEFAULT_D1_DATABASE;
  const { projectRef, rows } = await readSourceRows();
  const blockers: string[] = [];
  let wrangler = {
    args: ["wrangler", "d1", "execute", targetD1Database, "--remote", "--file", "<redacted-temp-sql-file>"],
    exitCode: rows.length === 0 ? 0 : null,
    signal: null,
    stdoutBytes: 0,
    stderrBytes: 0,
    timedOut: false,
  } satisfies BackfillReport["wrangler"];

  if (rows.length > 0) {
    const tempDir = mkdtempSync(join(tmpdir(), "archestimator-d1-beta-feedback-"));
    const sqlFile = join(tempDir, "beta-feedback-upsert.sql");
    try {
      writeFileSync(sqlFile, buildUpsertSql(rows));
      const result = spawnSync("bunx", ["wrangler", "d1", "execute", targetD1Database, "--remote", "--file", sqlFile], {
        cwd: resolve("."),
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 120_000,
      });

      wrangler = {
        args: ["wrangler", "d1", "execute", targetD1Database, "--remote", "--file", "<redacted-temp-sql-file>"],
        exitCode: result.status,
        signal: result.signal,
        stdoutBytes: result.stdout.length,
        stderrBytes: result.stderr.length,
        timedOut: Boolean(result.error && result.error.message.includes("ETIMEDOUT")),
      };

      if (result.status !== 0) blockers.push("Wrangler D1 upsert command failed; captured output was intentionally not persisted because SQL values include feedback content.");
    } finally {
      rmSync(tempDir, { force: true, recursive: true });
    }
  }

  const upsertSucceeded = rows.length === 0 || wrangler.exitCode === 0;
  const report: BackfillReport = {
    generatedAt,
    mode: "cloudflare-d1-beta-feedback-backfill",
    sourceProjectRef: projectRef,
    targetD1Database,
    sourceRows: rows.length,
    sourceStatusCounts: countBy(rows, "status"),
    sourceSeverityCounts: countBy(rows, "severity"),
    wrangler,
    readiness: {
      sourceProjectBoundaryReady: projectRef === EXPECTED_PROJECT_REF,
      upsertSucceeded,
      d1BackfillReady: upsertSucceeded,
    },
    blockers,
    note: "Backfill copies beta feedback submissions from the authorized Archestimator Supabase project into Cloudflare D1 without printing or storing message bodies, email addresses, or secrets.",
  };

  writeEvidence(report);
  console.log(
    [
      `[beta-feedback-d1-backfill] sourceRows=${report.sourceRows}`,
      `upsertSucceeded=${report.readiness.upsertSucceeded}`,
      `evidence=${EVIDENCE_JSON}`,
    ].join(" "),
  );

  if (!report.readiness.d1BackfillReady) process.exitCode = 1;
}

await main();
