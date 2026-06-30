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
const EVIDENCE_JSON = `${EVIDENCE_DIR}/2026-06-30-cloudflare-d1-profiles-backfill.json`;
const EVIDENCE_MD = `${EVIDENCE_DIR}/2026-06-30-cloudflare-d1-profiles-backfill.md`;

type ProfileRow = {
  avatar_url: string | null;
  created_at: string;
  default_workspace_id: string | null;
  display_name: string | null;
  email: string;
  id: string;
  role: string;
  updated_at: string;
};

type CountMap = Record<string, number>;

type BackfillReport = {
  generatedAt: string;
  mode: "cloudflare-d1-profiles-backfill";
  sourceProjectRef: string;
  targetD1Database: string;
  sourceRows: number;
  sourceRoleCounts: CountMap;
  sourceDefaultWorkspaceRows: number;
  wrangler: {
    args: string[];
    exitCode: number | null;
    signal: NodeJS.Signals | null;
    stdoutBytes: number;
    stderrBytes: number;
    timedOut: boolean;
  };
  d1Readback: {
    args: string[];
    exitCode: number | null;
    signal: NodeJS.Signals | null;
    stdoutBytes: number;
    stderrBytes: number;
    timedOut: boolean;
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
      `Refusing profiles D1 backfill; NEXT_PUBLIC_SUPABASE_URL points to project ${projectRef || "unknown"}, expected ${EXPECTED_PROJECT_REF}.`,
    );
  }
  return { projectRef, serviceRoleKey: serviceRoleKey!, supabaseUrl: supabaseUrl! };
}

function sqlValue(value: string | null | undefined) {
  if (value === null || value === undefined) return "NULL";
  return `'${value.replaceAll("'", "''")}'`;
}

function assertNoDuplicateEmails(rows: ProfileRow[]) {
  const seen = new Set<string>();
  for (const row of rows) {
    const email = row.email.trim();
    if (seen.has(email)) throw new Error(`Source profiles contains duplicate email ${email}; refusing lossy D1 backfill.`);
    seen.add(email);
  }
}

function assertRow(row: ProfileRow, index: number) {
  const email = row.email.trim();
  if (!row.id || !email || email !== email.toLowerCase()) {
    throw new Error(`Source profile row ${index} has an invalid id/email.`);
  }
  if (!["ceo", "admin", "member"].includes(row.role)) {
    throw new Error(`Source profile row ${index} has unsupported role ${row.role}.`);
  }
  if (!row.created_at || !row.updated_at) {
    throw new Error(`Source profile row ${index} is missing created_at/updated_at.`);
  }
}

function buildUpsertSql(rows: ProfileRow[]) {
  assertNoDuplicateEmails(rows);
  return [
    ...rows.map((row, index) => {
      assertRow(row, index);
      return `
INSERT INTO profiles (
  id,
  email,
  display_name,
  role,
  default_workspace_id,
  avatar_url,
  created_at,
  updated_at
) VALUES (
  ${sqlValue(row.id)},
  ${sqlValue(row.email)},
  ${sqlValue(row.display_name)},
  ${sqlValue(row.role)},
  ${sqlValue(row.default_workspace_id)},
  ${sqlValue(row.avatar_url)},
  ${sqlValue(row.created_at)},
  ${sqlValue(row.updated_at)}
)
ON CONFLICT(id) DO UPDATE SET
  email = excluded.email,
  display_name = excluded.display_name,
  role = excluded.role,
  default_workspace_id = excluded.default_workspace_id,
  avatar_url = excluded.avatar_url,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at;
`.trim();
    }),
    "",
  ].join("\n\n");
}

function countByRole(rows: ProfileRow[]) {
  return rows.reduce<CountMap>((counts, row) => {
    counts[row.role] = (counts[row.role] ?? 0) + 1;
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
  const command = "SELECT COUNT(*) AS rows FROM profiles;";
  const result = spawnSync("bunx", ["wrangler", "d1", "execute", targetD1Database, "--remote", "--command", command], {
    cwd: resolve("."),
    encoding: "utf8",
    timeout: 60_000,
    maxBuffer: 1024 * 1024,
  });
  const rows = extractReadbackRows(result.stdout ?? "");
  return {
    args: ["wrangler", "d1", "execute", targetD1Database, "--remote", "--command", "SELECT COUNT(*) AS rows FROM profiles;"],
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
    global: { headers: { "X-Client-Info": "archestimator-profiles-d1-backfill" } },
  });

  const rows: ProfileRow[] = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, display_name, role, default_workspace_id, avatar_url, created_at, updated_at")
      .order("created_at", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) throw new Error(`Unable to read profiles rows: ${error.message || error.code || "unknown error"}.`);
    rows.push(...(data as ProfileRow[]));
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
      "# Cloudflare D1 Profiles Backfill",
      "",
      `Generated: ${report.generatedAt}`,
      "",
      `- Source Supabase project: ${report.sourceProjectRef}`,
      `- Target D1 database: ${report.targetD1Database}`,
      `- Source rows copied: ${report.sourceRows}`,
      `- Source role counts: ${JSON.stringify(report.sourceRoleCounts)}`,
      `- Source rows with default workspace: ${report.sourceDefaultWorkspaceRows}`,
      `- Wrangler exit code: ${report.wrangler.exitCode}`,
      `- D1 readback rows: ${report.d1Readback.rows ?? "(unknown)"}`,
      `- D1 backfill ready: ${report.readiness.d1BackfillReady}`,
      `- Blockers: ${report.blockers.length > 0 ? report.blockers.join("; ") : "none"}`,
      "",
      "No user ids, email addresses, or secret values are stored in this evidence file.",
      "",
    ].join("\n"),
  );
}

async function main() {
  const generatedAt = new Date().toISOString();
  const targetD1Database = readEnv("ARCHESTIMATOR_D1_DATABASE") ?? DEFAULT_D1_DATABASE;
  const { projectRef, rows } = await readSourceRows();
  const sourceRoleCounts = countByRole(rows);
  const sourceDefaultWorkspaceRows = rows.filter((row) => row.default_workspace_id).length;
  const blockers: string[] = [];

  if (rows.length === 0) blockers.push("Supabase source profiles has no rows to backfill.");

  let wrangler = {
    args: ["wrangler", "d1", "execute", targetD1Database, "--remote", "--file", "<redacted-temp-sql-file>"],
    exitCode: null,
    signal: null,
    stdoutBytes: 0,
    stderrBytes: 0,
    timedOut: false,
  } satisfies BackfillReport["wrangler"];

  if (rows.length > 0) {
    const tempDir = mkdtempSync(join(tmpdir(), "archestimator-profiles-d1-"));
    const sqlPath = join(tempDir, "profiles-backfill.sql");
    try {
      writeFileSync(sqlPath, buildUpsertSql(rows));
      const result = spawnSync("bunx", ["wrangler", "d1", "execute", targetD1Database, "--remote", "--file", sqlPath], {
        cwd: resolve("."),
        encoding: "utf8",
        timeout: 120_000,
        maxBuffer: 1024 * 1024,
      });
      wrangler = {
        ...wrangler,
        exitCode: result.status,
        signal: result.signal,
        stdoutBytes: Buffer.byteLength(result.stdout ?? ""),
        stderrBytes: Buffer.byteLength(result.stderr ?? ""),
        timedOut: result.error?.message.includes("ETIMEDOUT") ?? false,
      };
      if (result.status !== 0) blockers.push("Wrangler D1 profile upsert failed; rerun script locally to inspect stderr.");
    } finally {
      rmSync(tempDir, { force: true, recursive: true });
    }
  }

  const d1Readback = readBackD1Rows(targetD1Database, rows.length);
  if (!d1Readback.ready) blockers.push("D1 profiles readback did not confirm all source rows.");

  const report: BackfillReport = {
    generatedAt,
    mode: "cloudflare-d1-profiles-backfill",
    sourceProjectRef: projectRef,
    targetD1Database,
    sourceRows: rows.length,
    sourceRoleCounts,
    sourceDefaultWorkspaceRows,
    wrangler,
    d1Readback,
    readiness: {
      sourceProjectBoundaryReady: projectRef === EXPECTED_PROJECT_REF,
      sourceRowsPresent: rows.length > 0,
      upsertSucceeded: rows.length > 0 && wrangler.exitCode === 0,
      d1ReadbackReady: d1Readback.ready,
      d1BackfillReady: blockers.length === 0,
    },
    blockers,
    note: "Evidence intentionally stores only counts and readiness booleans; profile ids/emails are not written to repo evidence.",
  };

  writeEvidence(report);
  console.log(JSON.stringify(report, null, 2));

  if (!report.readiness.d1BackfillReady) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
