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
const EVIDENCE_JSON = `${EVIDENCE_DIR}/2026-06-30-cloudflare-d1-legal-terms-backfill.json`;
const EVIDENCE_MD = `${EVIDENCE_DIR}/2026-06-30-cloudflare-d1-legal-terms-backfill.md`;

type LegalTermsAcceptanceRow = {
  accepted_at: string;
  acceptance_context: string;
  acceptance_method: string;
  created_at: string;
  id: string;
  metadata_json: unknown;
  privacy_policy_version: string;
  terms_content_hash: string;
  terms_effective_date: string;
  terms_key: string;
  terms_version: string;
  user_id: string;
};

type CountMap = Record<string, number>;

type BackfillReport = {
  generatedAt: string;
  mode: "cloudflare-d1-legal-terms-backfill";
  sourceProjectRef: string;
  targetD1Database: string;
  sourceRows: number;
  sourceTermsVersionCounts: CountMap;
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
      `Refusing legal-terms D1 backfill; NEXT_PUBLIC_SUPABASE_URL points to project ${projectRef || "unknown"}, expected ${EXPECTED_PROJECT_REF}.`,
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

function assertRow(row: LegalTermsAcceptanceRow, index: number) {
  if (!row.id || !row.user_id || !row.terms_key || !row.terms_version) {
    throw new Error(`Source row ${index} is missing required identity/version fields.`);
  }
  if (!/^sha256:[a-f0-9]{64}$/.test(row.terms_content_hash)) {
    throw new Error(`Source row ${index} has an invalid terms_content_hash.`);
  }
  if (row.acceptance_method !== "authenticated_clickwrap") {
    throw new Error(`Source row ${index} has unsupported acceptance_method ${row.acceptance_method}.`);
  }
  if (!["workshop_terms_gate", "settings_reacceptance", "admin_support_record"].includes(row.acceptance_context)) {
    throw new Error(`Source row ${index} has unsupported acceptance_context ${row.acceptance_context}.`);
  }
}

function buildUpsertSql(rows: LegalTermsAcceptanceRow[]) {
  return [
    ...rows.map((row, index) => {
      assertRow(row, index);
      return `
INSERT INTO legal_terms_acceptances (
  id,
  user_id,
  terms_key,
  terms_version,
  terms_effective_date,
  terms_content_hash,
  privacy_policy_version,
  acceptance_method,
  acceptance_context,
  metadata_json,
  accepted_at,
  created_at
) VALUES (
  ${sqlValue(row.id)},
  ${sqlValue(row.user_id)},
  ${sqlValue(row.terms_key)},
  ${sqlValue(row.terms_version)},
  ${sqlValue(row.terms_effective_date)},
  ${sqlValue(row.terms_content_hash)},
  ${sqlValue(row.privacy_policy_version)},
  ${sqlValue(row.acceptance_method)},
  ${sqlValue(row.acceptance_context)},
  ${sqlValue(metadataJson(row.metadata_json))},
  ${sqlValue(row.accepted_at)},
  ${sqlValue(row.created_at)}
)
ON CONFLICT(user_id, terms_key, terms_version) DO UPDATE SET
  terms_effective_date = excluded.terms_effective_date,
  terms_content_hash = excluded.terms_content_hash,
  privacy_policy_version = excluded.privacy_policy_version,
  acceptance_method = excluded.acceptance_method,
  acceptance_context = excluded.acceptance_context,
  metadata_json = excluded.metadata_json,
  accepted_at = excluded.accepted_at,
  created_at = excluded.created_at;
`.trim();
    }),
    "",
  ].join("\n\n");
}

function countByVersion(rows: LegalTermsAcceptanceRow[]) {
  return rows.reduce<CountMap>((counts, row) => {
    counts[row.terms_version] = (counts[row.terms_version] ?? 0) + 1;
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
  const command = "SELECT COUNT(*) AS rows FROM legal_terms_acceptances;";
  const result = spawnSync("bunx", ["wrangler", "d1", "execute", targetD1Database, "--remote", "--command", command], {
    cwd: resolve("."),
    encoding: "utf8",
    timeout: 60_000,
    maxBuffer: 1024 * 1024,
  });
  const rows = extractReadbackRows(result.stdout ?? "");
  return {
    args: ["wrangler", "d1", "execute", targetD1Database, "--remote", "--command", "SELECT COUNT(*) AS rows FROM legal_terms_acceptances;"],
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
    global: { headers: { "X-Client-Info": "archestimator-legal-terms-d1-backfill" } },
  });

  const rows: LegalTermsAcceptanceRow[] = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from("legal_terms_acceptances")
      .select("id, user_id, terms_key, terms_version, terms_effective_date, terms_content_hash, privacy_policy_version, acceptance_method, acceptance_context, metadata_json, accepted_at, created_at")
      .order("created_at", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) throw new Error(`Unable to read legal_terms_acceptances rows: ${error.message || error.code || "unknown error"}.`);
    rows.push(...(data as LegalTermsAcceptanceRow[]));
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
      "# Cloudflare D1 Legal Terms Backfill",
      "",
      `Generated: ${report.generatedAt}`,
      "",
      `- Source Supabase project: ${report.sourceProjectRef}`,
      `- Target D1 database: ${report.targetD1Database}`,
      `- Source rows copied: ${report.sourceRows}`,
      `- Source Terms version counts: ${JSON.stringify(report.sourceTermsVersionCounts)}`,
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
    const tempDir = mkdtempSync(join(tmpdir(), "archestimator-legal-terms-d1-"));
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
      if (result.status !== 0) blockers.push("Wrangler D1 legal-terms backfill command failed.");
    } finally {
      rmSync(tempDir, { force: true, recursive: true });
    }
  }

  const d1Readback = readBackD1Rows(targetD1Database, rows.length);
  if (!d1Readback.ready) blockers.push("D1 legal_terms_acceptances readback did not match the Supabase source row count.");

  const report: BackfillReport = {
    generatedAt,
    mode: "cloudflare-d1-legal-terms-backfill",
    sourceProjectRef: projectRef,
    targetD1Database,
    sourceRows: rows.length,
    sourceTermsVersionCounts: countByVersion(rows),
    wrangler,
    d1Readback,
    readiness: {
      sourceProjectBoundaryReady: projectRef === EXPECTED_PROJECT_REF,
      upsertSucceeded: rows.length === 0 || wrangler.exitCode === 0,
      d1ReadbackReady: d1Readback.ready,
      d1BackfillReady: projectRef === EXPECTED_PROJECT_REF
        && (rows.length === 0 || wrangler.exitCode === 0)
        && d1Readback.ready,
    },
    blockers,
    note:
      "Provider backfill for the legal Terms acceptance D1 slice. Reads only the expected Archestimator Supabase project, writes idempotent rows to Cloudflare D1, and records sanitized counts only.",
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
