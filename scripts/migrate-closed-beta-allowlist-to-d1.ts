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
const EVIDENCE_JSON = `${EVIDENCE_DIR}/2026-06-30-cloudflare-d1-closed-beta-backfill.json`;
const EVIDENCE_MD = `${EVIDENCE_DIR}/2026-06-30-cloudflare-d1-closed-beta-backfill.md`;

type ClosedBetaAllowlistRow = {
  accepted_at: string | null;
  created_at: string;
  id: string;
  invited_at: string;
  invited_by: string | null;
  metadata: unknown;
  normalized_email: string;
  notes: string | null;
  status: string;
  updated_at: string;
};

type StatusCounts = Record<string, number>;

type BackfillReport = {
  generatedAt: string;
  mode: "cloudflare-d1-closed-beta-backfill";
  sourceProjectRef: string;
  targetD1Database: string;
  sourceRows: number;
  sourceStatusCounts: StatusCounts;
  sourceAllowedRows: number;
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
    sourceRowsPresent: boolean;
    upsertSucceeded: boolean;
    d1BackfillReady: boolean;
  };
  blockers: string[];
  note: string;
};

function unquoteEnvValue(value: string) {
  const trimmed = value.trim();
  const quote = trimmed[0];
  if ((quote === "\"" || quote === "'") && trimmed.endsWith(quote)) {
    return trimmed.slice(1, -1);
  }
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

  if (missing.length > 0) {
    throw new Error(`Missing required environment variable(s): ${missing.join(", ")}.`);
  }

  const projectRef = readProjectRef(supabaseUrl!);
  if (projectRef !== EXPECTED_PROJECT_REF) {
    throw new Error(
      `Refusing closed-beta D1 backfill; NEXT_PUBLIC_SUPABASE_URL points to project ${projectRef || "unknown"}, expected ${EXPECTED_PROJECT_REF}.`,
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

function assertRow(row: ClosedBetaAllowlistRow, index: number) {
  const normalizedEmail = row.normalized_email.trim();
  if (!normalizedEmail || normalizedEmail !== normalizedEmail.toLowerCase()) {
    throw new Error(`Source row ${index} has an invalid normalized email.`);
  }
  if (!["invited", "active", "revoked"].includes(row.status)) {
    throw new Error(`Source row ${index} has unsupported status ${row.status}.`);
  }
}

function buildUpsertSql(rows: ClosedBetaAllowlistRow[]) {
  const statements = rows.map((row, index) => {
    assertRow(row, index);
    return `
INSERT INTO closed_beta_allowed_emails (
  id,
  normalized_email,
  status,
  invited_by,
  invited_at,
  accepted_at,
  notes,
  metadata_json,
  created_at,
  updated_at
) VALUES (
  ${sqlValue(row.id)},
  ${sqlValue(row.normalized_email)},
  ${sqlValue(row.status)},
  ${sqlValue(row.invited_by)},
  ${sqlValue(row.invited_at)},
  ${sqlValue(row.accepted_at)},
  ${sqlValue(row.notes)},
  ${sqlValue(metadataJson(row.metadata))},
  ${sqlValue(row.created_at)},
  ${sqlValue(row.updated_at)}
)
ON CONFLICT(normalized_email) DO UPDATE SET
  status = excluded.status,
  invited_by = excluded.invited_by,
  invited_at = excluded.invited_at,
  accepted_at = excluded.accepted_at,
  notes = excluded.notes,
  metadata_json = excluded.metadata_json,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at;
`.trim();
  });

  // D1 remote query execution rejects explicit BEGIN/COMMIT statements. Keep
  // rows idempotent so the file can be re-run safely if a later row fails.
  return [...statements, ""].join("\n\n");
}

function statusCounts(rows: ClosedBetaAllowlistRow[]) {
  return rows.reduce<StatusCounts>((counts, row) => {
    counts[row.status] = (counts[row.status] ?? 0) + 1;
    return counts;
  }, {});
}

async function readSourceRows() {
  const { projectRef, serviceRoleKey, supabaseUrl } = requireProviderInputs();
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { "X-Client-Info": "archestimator-closed-beta-d1-backfill" } },
  });

  const rows: ClosedBetaAllowlistRow[] = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from("closed_beta_allowed_emails")
      .select("id, normalized_email, status, invited_by, invited_at, accepted_at, notes, metadata, created_at, updated_at")
      .order("created_at", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) throw new Error(`Unable to read closed-beta allowlist rows: ${error.message || error.code || "unknown error"}.`);
    rows.push(...(data as ClosedBetaAllowlistRow[]));
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
      "# Cloudflare D1 Closed-Beta Backfill",
      "",
      `Generated: ${report.generatedAt}`,
      "",
      `- Source Supabase project: ${report.sourceProjectRef}`,
      `- Target D1 database: ${report.targetD1Database}`,
      `- Source rows copied: ${report.sourceRows}`,
      `- Source allowed rows: ${report.sourceAllowedRows}`,
      `- Source status counts: ${JSON.stringify(report.sourceStatusCounts)}`,
      `- Wrangler exit code: ${report.wrangler.exitCode}`,
      `- D1 backfill ready: ${report.readiness.d1BackfillReady}`,
      `- Blockers: ${report.blockers.length > 0 ? report.blockers.join("; ") : "none"}`,
      "",
      "No email addresses or secret values are stored in this evidence file.",
      "",
    ].join("\n"),
  );
}

async function main() {
  const generatedAt = new Date().toISOString();
  const targetD1Database = readEnv("ARCHESTIMATOR_D1_DATABASE") ?? DEFAULT_D1_DATABASE;
  const { projectRef, rows } = await readSourceRows();
  const sourceStatusCounts = statusCounts(rows);
  const sourceAllowedRows = rows.filter((row) => row.status === "invited" || row.status === "active").length;
  const blockers: string[] = [];

  if (rows.length === 0) blockers.push("Supabase source closed_beta_allowed_emails has no rows to backfill.");

  let wrangler = {
    args: ["wrangler", "d1", "execute", targetD1Database, "--remote", "--file", "<redacted-temp-sql-file>"],
    exitCode: null,
    signal: null,
    stdoutBytes: 0,
    stderrBytes: 0,
    timedOut: false,
  } satisfies BackfillReport["wrangler"];

  if (rows.length > 0) {
    const tempDir = mkdtempSync(join(tmpdir(), "archestimator-d1-closed-beta-"));
    const sqlFile = join(tempDir, "closed-beta-allowlist-upsert.sql");
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

      if (result.status !== 0) blockers.push("Wrangler D1 upsert command failed; captured output was intentionally not persisted because SQL values include allowlist addresses.");
    } finally {
      rmSync(tempDir, { force: true, recursive: true });
    }
  }

  const report: BackfillReport = {
    generatedAt,
    mode: "cloudflare-d1-closed-beta-backfill",
    sourceProjectRef: projectRef,
    targetD1Database,
    sourceRows: rows.length,
    sourceStatusCounts,
    sourceAllowedRows,
    wrangler,
    readiness: {
      sourceProjectBoundaryReady: projectRef === EXPECTED_PROJECT_REF,
      sourceRowsPresent: rows.length > 0,
      upsertSucceeded: rows.length > 0 && wrangler.exitCode === 0,
      d1BackfillReady: rows.length > 0 && wrangler.exitCode === 0,
    },
    blockers,
    note: "Backfill copies closed-beta allowlist rows from the authorized Archestimator Supabase project into Cloudflare D1 without printing or storing email addresses.",
  };

  writeEvidence(report);
  console.log(
    [
      `[closed-beta-d1-backfill] sourceRows=${report.sourceRows}`,
      `allowedRows=${report.sourceAllowedRows}`,
      `upsertSucceeded=${report.readiness.upsertSucceeded}`,
      `evidence=${EVIDENCE_JSON}`,
    ].join(" "),
  );

  if (!report.readiness.d1BackfillReady) process.exitCode = 1;
}

await main();
