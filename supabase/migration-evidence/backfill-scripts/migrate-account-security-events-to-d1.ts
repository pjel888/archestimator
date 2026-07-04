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
const EVIDENCE_JSON = `${EVIDENCE_DIR}/2026-06-30-cloudflare-d1-account-security-events-backfill.json`;
const EVIDENCE_MD = `${EVIDENCE_DIR}/2026-06-30-cloudflare-d1-account-security-events-backfill.md`;

type AccountSecurityEventRow = {
  created_at: string;
  event_type: string;
  id: string;
  ip_hash: string | null;
  metadata_json: unknown;
  request_id: string | null;
  user_agent_hash: string | null;
  user_id: string | null;
  workspace_id: string | null;
};

type CountMap = Record<string, number>;

type CommandReport = {
  args: string[];
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdoutBytes: number;
  stderrBytes: number;
  timedOut: boolean;
};

type BackfillReport = {
  generatedAt: string;
  mode: "cloudflare-d1-account-security-events-backfill";
  sourceProjectRef: string;
  targetD1Database: string;
  sourceRows: number;
  sourceEventTypeCounts: CountMap;
  sourceRowsWithUser: number;
  sourceRowsWithWorkspace: number;
  wrangler: CommandReport;
  d1Readback: CommandReport & {
    rows: number | null;
    ready: boolean;
  };
  readiness: {
    sourceProjectBoundaryReady: boolean;
    sourceRowsPresent: boolean;
    upsertSucceeded: boolean;
    d1ReadbackReady: boolean;
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
      `Refusing account-security-events D1 backfill; NEXT_PUBLIC_SUPABASE_URL points to project ${projectRef || "unknown"}, expected ${EXPECTED_PROJECT_REF}.`,
    );
  }
  return { projectRef, serviceRoleKey: serviceRoleKey!, supabaseUrl: supabaseUrl! };
}

function sqlValue(value: string | null | undefined) {
  if (value === null || value === undefined) return "NULL";
  return `'${value.replaceAll("'", "''")}'`;
}

function normalizeMetadataJson(value: unknown, index: number) {
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      throw new Error(`Source account_security_events row ${index} has invalid metadata_json.`);
    }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`Source account_security_events row ${index} metadata_json is not a JSON object.`);
  }
  return JSON.stringify(parsed);
}

function assertOptionalHash(value: string | null, column: string, index: number) {
  if (value !== null && !/^sha256:[a-f0-9]{64}$/.test(value)) {
    throw new Error(`Source account_security_events row ${index} has invalid ${column}.`);
  }
}

function assertRow(row: AccountSecurityEventRow, index: number) {
  if (!row.id || !row.event_type.trim() || !row.created_at) {
    throw new Error(`Source account_security_events row ${index} is missing required id/event_type/created_at.`);
  }
  assertOptionalHash(row.ip_hash, "ip_hash", index);
  assertOptionalHash(row.user_agent_hash, "user_agent_hash", index);
}

function buildUpsertSql(rows: AccountSecurityEventRow[]) {
  return [
    ...rows.map((row, index) => {
      assertRow(row, index);
      return `
INSERT INTO account_security_events (
  id,
  event_type,
  user_id,
  workspace_id,
  request_id,
  ip_hash,
  user_agent_hash,
  metadata_json,
  created_at
) VALUES (
  ${sqlValue(row.id)},
  ${sqlValue(row.event_type.trim())},
  ${sqlValue(row.user_id)},
  ${sqlValue(row.workspace_id)},
  ${sqlValue(row.request_id)},
  ${sqlValue(row.ip_hash)},
  ${sqlValue(row.user_agent_hash)},
  ${sqlValue(normalizeMetadataJson(row.metadata_json, index))},
  ${sqlValue(row.created_at)}
)
ON CONFLICT(id) DO UPDATE SET
  event_type = excluded.event_type,
  user_id = excluded.user_id,
  workspace_id = excluded.workspace_id,
  request_id = excluded.request_id,
  ip_hash = excluded.ip_hash,
  user_agent_hash = excluded.user_agent_hash,
  metadata_json = excluded.metadata_json,
  created_at = excluded.created_at;
`.trim();
    }),
    "",
  ].join("\n\n");
}

function countByEventType(rows: AccountSecurityEventRow[]) {
  return rows.reduce<CountMap>((counts, row) => {
    const eventType = row.event_type.trim();
    counts[eventType] = (counts[eventType] ?? 0) + 1;
    return counts;
  }, {});
}

function extractJsonArray(input: string) {
  const start = input.indexOf("[");
  const end = input.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(input.slice(start, end + 1)) as unknown;
  } catch {
    return null;
  }
}

function extractReadbackRows(stdout: string) {
  const parsed = extractJsonArray(stdout);
  if (!Array.isArray(parsed)) return null;
  const first = parsed[0];
  if (!first || typeof first !== "object") return null;
  const results = (first as { results?: unknown }).results;
  if (!Array.isArray(results)) return null;
  const row = results[0];
  if (!row || typeof row !== "object") return null;
  const rows = (row as { rows?: unknown }).rows;
  return typeof rows === "number" ? rows : null;
}

function readBackD1Rows(targetD1Database: string, expectedSourceRows: number): BackfillReport["d1Readback"] {
  const command = "SELECT COUNT(*) AS rows FROM account_security_events;";
  const result = spawnSync("bunx", ["wrangler", "d1", "execute", targetD1Database, "--remote", "--command", command], {
    cwd: resolve("."),
    encoding: "utf8",
    timeout: 60_000,
    maxBuffer: 1024 * 1024,
  });
  const rows = extractReadbackRows(result.stdout ?? "");
  return {
    args: ["wrangler", "d1", "execute", targetD1Database, "--remote", "--command", command],
    exitCode: result.status,
    signal: result.signal,
    stdoutBytes: Buffer.byteLength(result.stdout ?? ""),
    stderrBytes: Buffer.byteLength(result.stderr ?? ""),
    timedOut: result.error?.message.includes("ETIMEDOUT") ?? false,
    rows,
    ready: result.status === 0 && rows !== null && rows >= expectedSourceRows,
  };
}

async function readSourceRows() {
  const { projectRef, serviceRoleKey, supabaseUrl } = requireProviderInputs();
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { "X-Client-Info": "archestimator-account-security-events-d1-backfill" } },
  });

  const rows: AccountSecurityEventRow[] = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from("account_security_events")
      .select("id, event_type, user_id, workspace_id, request_id, ip_hash, user_agent_hash, metadata_json, created_at")
      .order("created_at", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) throw new Error(`Unable to read account_security_events rows: ${error.message || error.code || "unknown error"}.`);
    rows.push(...(data as AccountSecurityEventRow[]));
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
      "# Cloudflare D1 Account Security Events Backfill",
      "",
      `Generated: ${report.generatedAt}`,
      "",
      `- Source Supabase project: ${report.sourceProjectRef}`,
      `- Target D1 database: ${report.targetD1Database}`,
      `- Source rows copied: ${report.sourceRows}`,
      `- Source event type counts: ${JSON.stringify(report.sourceEventTypeCounts)}`,
      `- Source rows with user id: ${report.sourceRowsWithUser}`,
      `- Source rows with workspace id: ${report.sourceRowsWithWorkspace}`,
      `- Wrangler exit code: ${report.wrangler.exitCode}`,
      `- D1 readback rows: ${report.d1Readback.rows ?? "(unknown)"}`,
      `- D1 backfill ready: ${report.readiness.d1BackfillReady}`,
      `- Blockers: ${report.blockers.length > 0 ? report.blockers.join("; ") : "none"}`,
      "",
      "No user ids, workspace ids, request ids, IP hashes, user-agent hashes, email addresses, or secret values are stored in this evidence file.",
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
  } satisfies CommandReport;

  if (rows.length > 0) {
    const tempDir = mkdtempSync(join(tmpdir(), "archestimator-account-events-d1-"));
    const tempSql = join(tempDir, "backfill.sql");
    try {
      writeFileSync(tempSql, buildUpsertSql(rows));
      const result = spawnSync("bunx", ["wrangler", "d1", "execute", targetD1Database, "--remote", "--file", tempSql], {
        cwd: resolve("."),
        encoding: "utf8",
        timeout: 120_000,
        maxBuffer: 1024 * 1024,
      });
      wrangler = {
        args: ["wrangler", "d1", "execute", targetD1Database, "--remote", "--file", "<redacted-temp-sql-file>"],
        exitCode: result.status,
        signal: result.signal,
        stdoutBytes: Buffer.byteLength(result.stdout ?? ""),
        stderrBytes: Buffer.byteLength(result.stderr ?? ""),
        timedOut: result.error?.message.includes("ETIMEDOUT") ?? false,
      };
      if (result.status !== 0) blockers.push("Wrangler D1 account-security-events backfill command failed.");
    } finally {
      rmSync(tempDir, { force: true, recursive: true });
    }
  }

  const d1Readback = readBackD1Rows(targetD1Database, rows.length);
  if (!d1Readback.ready) blockers.push("D1 account_security_events readback did not match the Supabase source row count.");

  const upsertSucceeded = rows.length === 0 || wrangler.exitCode === 0;
  const report: BackfillReport = {
    generatedAt,
    mode: "cloudflare-d1-account-security-events-backfill",
    sourceProjectRef: projectRef,
    targetD1Database,
    sourceRows: rows.length,
    sourceEventTypeCounts: countByEventType(rows),
    sourceRowsWithUser: rows.filter((row) => row.user_id).length,
    sourceRowsWithWorkspace: rows.filter((row) => row.workspace_id).length,
    wrangler,
    d1Readback,
    readiness: {
      sourceProjectBoundaryReady: projectRef === EXPECTED_PROJECT_REF,
      sourceRowsPresent: rows.length > 0,
      upsertSucceeded,
      d1ReadbackReady: d1Readback.ready,
      d1BackfillReady: projectRef === EXPECTED_PROJECT_REF && upsertSucceeded && d1Readback.ready && blockers.length === 0,
    },
    blockers,
    note:
      "Provider backfill for the account security event D1 slice. Reads only the expected Archestimator Supabase project, writes idempotent rows to Cloudflare D1, and records sanitized aggregate counts only.",
  };

  writeEvidence(report);
  console.log(JSON.stringify(report, null, 2));
  if (!report.readiness.d1BackfillReady) process.exitCode = 1;
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
