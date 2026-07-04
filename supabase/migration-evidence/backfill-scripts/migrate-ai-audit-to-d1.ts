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
const EVIDENCE_JSON = `${EVIDENCE_DIR}/2026-06-30-cloudflare-d1-ai-audit-backfill.json`;
const EVIDENCE_MD = `${EVIDENCE_DIR}/2026-06-30-cloudflare-d1-ai-audit-backfill.md`;

type JsonLike = unknown;
type CountMap = Record<string, number>;

type AiActionRunRow = {
  actor_user_id: string;
  blocked_reason: string | null;
  completed_at: string | null;
  created_at: string;
  error_class: string | null;
  id: string;
  metadata: JsonLike;
  mode: string;
  model: string;
  provider: string;
  provider_response_id: string | null;
  provider_send_categories: string[];
  redaction_status: string;
  request_host: string | null;
  request_message_hash: string | null;
  route_context_hash: string | null;
  run_id: string;
  started_at: string;
  status: string;
  usage: JsonLike;
  user_agent_hash: string | null;
  workspace_id: string;
};

type AiToolCallRow = {
  actor_user_id: string;
  args_hash: string | null;
  completed_at: string | null;
  created_at: string;
  id: string;
  mode: string;
  result_hash: string | null;
  run_id: string;
  safe_summary: string;
  started_at: string;
  status: string;
  target_estimate_id: string | null;
  target_node_id: string | null;
  target_project_id: string | null;
  target_row_id: string | null;
  tool_name: string;
  validation_errors: JsonLike;
  workspace_id: string;
};

type AiDataAccessEventRow = {
  actor_user_id: string;
  blocked_attempt: boolean;
  blocked_reason: string | null;
  created_at: string;
  event_name: string;
  filter_hash: string | null;
  id: string;
  redaction_status: string;
  row_count: number;
  run_id: string;
  safe_summary: string;
  source_tables: string[];
  target_estimate_id: string | null;
  target_node_id: string | null;
  target_project_id: string | null;
  target_row_id: string | null;
  tool_call_id: string | null;
  workspace_id: string;
};

type SecurityRateLimitEventRow = {
  expires_at: string;
  id: string;
  key_hash: string;
  metadata_json: JsonLike;
  occurred_at: string;
  scope: string;
};

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
  mode: "cloudflare-d1-ai-audit-backfill";
  sourceProjectRef: string;
  targetD1Database: string;
  sourceRows: {
    aiActionRuns: number;
    aiToolCalls: number;
    aiDataAccessEvents: number;
    securityRateLimitEvents: number;
  };
  sourceModeCounts: CountMap;
  sourceStatusCounts: CountMap;
  sourceRateLimitScopeCounts: CountMap;
  wrangler: CommandReport;
  d1Readback: CommandReport & {
    aiActionRuns: number | null;
    aiToolCalls: number | null;
    aiDataAccessEvents: number | null;
    securityRateLimitEvents: number | null;
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
      `Refusing AI audit D1 backfill; NEXT_PUBLIC_SUPABASE_URL points to project ${projectRef || "unknown"}, expected ${EXPECTED_PROJECT_REF}.`,
    );
  }
  return { projectRef, serviceRoleKey: serviceRoleKey!, supabaseUrl: supabaseUrl! };
}

function sqlValue(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "1" : "0";
  return `'${value.replaceAll("'", "''")}'`;
}

function jsonText(value: JsonLike, fallback: JsonLike) {
  const next = value === null || value === undefined ? fallback : value;
  return JSON.stringify(next);
}

function countBy<T>(rows: T[], readValue: (row: T) => string) {
  return rows.reduce<CountMap>((counts, row) => {
    const value = readValue(row);
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function assertRequired(value: string | null | undefined, label: string, index: number) {
  if (!value || !value.trim()) throw new Error(`${label} row ${index} is missing a required text field.`);
}

function buildActionRunUpserts(rows: AiActionRunRow[]) {
  return rows.map((row, index) => {
    assertRequired(row.id, "ai_action_runs", index);
    assertRequired(row.run_id, "ai_action_runs", index);
    return `
INSERT INTO ai_action_runs (
  id,
  run_id,
  workspace_id,
  actor_user_id,
  mode,
  status,
  provider,
  model,
  provider_response_id,
  request_message_hash,
  route_context_hash,
  provider_send_categories_json,
  redaction_status,
  usage_json,
  error_class,
  blocked_reason,
  request_host,
  user_agent_hash,
  metadata_json,
  started_at,
  completed_at,
  created_at
) VALUES (
  ${sqlValue(row.id)},
  ${sqlValue(row.run_id)},
  ${sqlValue(row.workspace_id)},
  ${sqlValue(row.actor_user_id)},
  ${sqlValue(row.mode)},
  ${sqlValue(row.status)},
  ${sqlValue(row.provider)},
  ${sqlValue(row.model)},
  ${sqlValue(row.provider_response_id)},
  ${sqlValue(row.request_message_hash)},
  ${sqlValue(row.route_context_hash)},
  ${sqlValue(jsonText(row.provider_send_categories, []))},
  ${sqlValue(row.redaction_status)},
  ${sqlValue(jsonText(row.usage, {}))},
  ${sqlValue(row.error_class)},
  ${sqlValue(row.blocked_reason)},
  ${sqlValue(row.request_host)},
  ${sqlValue(row.user_agent_hash)},
  ${sqlValue(jsonText(row.metadata, {}))},
  ${sqlValue(row.started_at)},
  ${sqlValue(row.completed_at)},
  ${sqlValue(row.created_at)}
)
ON CONFLICT(run_id) DO UPDATE SET
  workspace_id = excluded.workspace_id,
  actor_user_id = excluded.actor_user_id,
  mode = excluded.mode,
  status = excluded.status,
  provider = excluded.provider,
  model = excluded.model,
  provider_response_id = excluded.provider_response_id,
  request_message_hash = excluded.request_message_hash,
  route_context_hash = excluded.route_context_hash,
  provider_send_categories_json = excluded.provider_send_categories_json,
  redaction_status = excluded.redaction_status,
  usage_json = excluded.usage_json,
  error_class = excluded.error_class,
  blocked_reason = excluded.blocked_reason,
  request_host = excluded.request_host,
  user_agent_hash = excluded.user_agent_hash,
  metadata_json = excluded.metadata_json,
  started_at = excluded.started_at,
  completed_at = excluded.completed_at,
  created_at = excluded.created_at;
`.trim();
  });
}

function buildToolCallUpserts(rows: AiToolCallRow[]) {
  return rows.map((row, index) => {
    assertRequired(row.id, "ai_tool_calls", index);
    assertRequired(row.run_id, "ai_tool_calls", index);
    return `
INSERT INTO ai_tool_calls (
  id,
  run_id,
  workspace_id,
  actor_user_id,
  tool_name,
  mode,
  status,
  target_project_id,
  target_estimate_id,
  target_node_id,
  target_row_id,
  args_hash,
  result_hash,
  validation_errors_json,
  safe_summary,
  started_at,
  completed_at,
  created_at
) VALUES (
  ${sqlValue(row.id)},
  ${sqlValue(row.run_id)},
  ${sqlValue(row.workspace_id)},
  ${sqlValue(row.actor_user_id)},
  ${sqlValue(row.tool_name)},
  ${sqlValue(row.mode)},
  ${sqlValue(row.status)},
  ${sqlValue(row.target_project_id)},
  ${sqlValue(row.target_estimate_id)},
  ${sqlValue(row.target_node_id)},
  ${sqlValue(row.target_row_id)},
  ${sqlValue(row.args_hash)},
  ${sqlValue(row.result_hash)},
  ${sqlValue(jsonText(row.validation_errors, []))},
  ${sqlValue(row.safe_summary)},
  ${sqlValue(row.started_at)},
  ${sqlValue(row.completed_at)},
  ${sqlValue(row.created_at)}
)
ON CONFLICT(id) DO UPDATE SET
  run_id = excluded.run_id,
  workspace_id = excluded.workspace_id,
  actor_user_id = excluded.actor_user_id,
  tool_name = excluded.tool_name,
  mode = excluded.mode,
  status = excluded.status,
  target_project_id = excluded.target_project_id,
  target_estimate_id = excluded.target_estimate_id,
  target_node_id = excluded.target_node_id,
  target_row_id = excluded.target_row_id,
  args_hash = excluded.args_hash,
  result_hash = excluded.result_hash,
  validation_errors_json = excluded.validation_errors_json,
  safe_summary = excluded.safe_summary,
  started_at = excluded.started_at,
  completed_at = excluded.completed_at,
  created_at = excluded.created_at;
`.trim();
  });
}

function buildDataAccessUpserts(rows: AiDataAccessEventRow[]) {
  return rows.map((row, index) => {
    assertRequired(row.id, "ai_data_access_events", index);
    assertRequired(row.run_id, "ai_data_access_events", index);
    return `
INSERT INTO ai_data_access_events (
  id,
  run_id,
  tool_call_id,
  workspace_id,
  actor_user_id,
  event_name,
  source_tables_json,
  target_project_id,
  target_estimate_id,
  target_node_id,
  target_row_id,
  filter_hash,
  row_count,
  blocked_attempt,
  blocked_reason,
  redaction_status,
  safe_summary,
  created_at
) VALUES (
  ${sqlValue(row.id)},
  ${sqlValue(row.run_id)},
  ${sqlValue(row.tool_call_id)},
  ${sqlValue(row.workspace_id)},
  ${sqlValue(row.actor_user_id)},
  ${sqlValue(row.event_name)},
  ${sqlValue(jsonText(row.source_tables, []))},
  ${sqlValue(row.target_project_id)},
  ${sqlValue(row.target_estimate_id)},
  ${sqlValue(row.target_node_id)},
  ${sqlValue(row.target_row_id)},
  ${sqlValue(row.filter_hash)},
  ${sqlValue(row.row_count)},
  ${sqlValue(row.blocked_attempt)},
  ${sqlValue(row.blocked_reason)},
  ${sqlValue(row.redaction_status)},
  ${sqlValue(row.safe_summary)},
  ${sqlValue(row.created_at)}
)
ON CONFLICT(id) DO UPDATE SET
  run_id = excluded.run_id,
  tool_call_id = excluded.tool_call_id,
  workspace_id = excluded.workspace_id,
  actor_user_id = excluded.actor_user_id,
  event_name = excluded.event_name,
  source_tables_json = excluded.source_tables_json,
  target_project_id = excluded.target_project_id,
  target_estimate_id = excluded.target_estimate_id,
  target_node_id = excluded.target_node_id,
  target_row_id = excluded.target_row_id,
  filter_hash = excluded.filter_hash,
  row_count = excluded.row_count,
  blocked_attempt = excluded.blocked_attempt,
  blocked_reason = excluded.blocked_reason,
  redaction_status = excluded.redaction_status,
  safe_summary = excluded.safe_summary,
  created_at = excluded.created_at;
`.trim();
  });
}

function buildRateLimitUpserts(rows: SecurityRateLimitEventRow[]) {
  return rows.map((row, index) => {
    assertRequired(row.id, "security_rate_limit_events", index);
    assertRequired(row.scope, "security_rate_limit_events", index);
    return `
INSERT INTO security_rate_limit_events (
  id,
  scope,
  key_hash,
  metadata_json,
  occurred_at,
  expires_at
) VALUES (
  ${sqlValue(row.id)},
  ${sqlValue(row.scope)},
  ${sqlValue(row.key_hash)},
  ${sqlValue(jsonText(row.metadata_json, {}))},
  ${sqlValue(row.occurred_at)},
  ${sqlValue(row.expires_at)}
)
ON CONFLICT(id) DO UPDATE SET
  scope = excluded.scope,
  key_hash = excluded.key_hash,
  metadata_json = excluded.metadata_json,
  occurred_at = excluded.occurred_at,
  expires_at = excluded.expires_at;
`.trim();
  });
}

function buildUpsertSql(input: {
  actionRuns: AiActionRunRow[];
  toolCalls: AiToolCallRow[];
  dataAccessEvents: AiDataAccessEventRow[];
  rateLimitEvents: SecurityRateLimitEventRow[];
}) {
  return [
    ...buildActionRunUpserts(input.actionRuns),
    ...buildToolCallUpserts(input.toolCalls),
    ...buildDataAccessUpserts(input.dataAccessEvents),
    ...buildRateLimitUpserts(input.rateLimitEvents),
    "",
  ].join("\n\n");
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

function extractCount(stdout: string, key: string) {
  const parsed = extractJsonArray(stdout);
  if (!Array.isArray(parsed)) return null;
  const first = parsed[0];
  if (!first || typeof first !== "object") return null;
  const results = (first as { results?: unknown }).results;
  if (!Array.isArray(results)) return null;
  const row = results[0];
  if (!row || typeof row !== "object") return null;
  const value = (row as Record<string, unknown>)[key];
  return typeof value === "number" ? value : null;
}

function readBackD1Rows(
  targetD1Database: string,
  expected: BackfillReport["sourceRows"],
): BackfillReport["d1Readback"] {
  const command = [
    "SELECT",
    "(SELECT COUNT(*) FROM ai_action_runs) AS aiActionRuns,",
    "(SELECT COUNT(*) FROM ai_tool_calls) AS aiToolCalls,",
    "(SELECT COUNT(*) FROM ai_data_access_events) AS aiDataAccessEvents,",
    "(SELECT COUNT(*) FROM security_rate_limit_events) AS securityRateLimitEvents;",
  ].join(" ");
  const result = spawnSync("bunx", ["wrangler", "d1", "execute", targetD1Database, "--remote", "--command", command], {
    cwd: resolve("."),
    encoding: "utf8",
    timeout: 60_000,
    maxBuffer: 1024 * 1024,
  });
  const aiActionRuns = extractCount(result.stdout ?? "", "aiActionRuns");
  const aiToolCalls = extractCount(result.stdout ?? "", "aiToolCalls");
  const aiDataAccessEvents = extractCount(result.stdout ?? "", "aiDataAccessEvents");
  const securityRateLimitEvents = extractCount(result.stdout ?? "", "securityRateLimitEvents");
  return {
    args: ["wrangler", "d1", "execute", targetD1Database, "--remote", "--command", command],
    exitCode: result.status,
    signal: result.signal,
    stdoutBytes: Buffer.byteLength(result.stdout ?? ""),
    stderrBytes: Buffer.byteLength(result.stderr ?? ""),
    timedOut: result.error?.message.includes("ETIMEDOUT") ?? false,
    aiActionRuns,
    aiToolCalls,
    aiDataAccessEvents,
    securityRateLimitEvents,
    ready:
      result.status === 0
      && aiActionRuns !== null
      && aiToolCalls !== null
      && aiDataAccessEvents !== null
      && securityRateLimitEvents !== null
      && aiActionRuns >= expected.aiActionRuns
      && aiToolCalls >= expected.aiToolCalls
      && aiDataAccessEvents >= expected.aiDataAccessEvents
      && securityRateLimitEvents >= expected.securityRateLimitEvents,
  };
}

async function readAllPages<T>(
  queryFactory: (from: number, to: number) => Promise<{ data: unknown[] | null; error: { message?: string; code?: string } | null }>,
  table: string,
) {
  const rows: T[] = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await queryFactory(offset, offset + pageSize - 1);
    if (error) throw new Error(`Unable to read ${table} rows: ${error.message || error.code || "unknown error"}.`);
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

async function readSourceRows() {
  const { projectRef, serviceRoleKey, supabaseUrl } = requireProviderInputs();
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { "X-Client-Info": "archestimator-ai-audit-d1-backfill" } },
  });

  const [actionRuns, toolCalls, dataAccessEvents, rateLimitEvents] = await Promise.all([
    readAllPages<AiActionRunRow>((from, to) => supabase
      .from("ai_action_runs")
      .select("*")
      .order("created_at", { ascending: true })
      .range(from, to), "ai_action_runs"),
    readAllPages<AiToolCallRow>((from, to) => supabase
      .from("ai_tool_calls")
      .select("*")
      .order("created_at", { ascending: true })
      .range(from, to), "ai_tool_calls"),
    readAllPages<AiDataAccessEventRow>((from, to) => supabase
      .from("ai_data_access_events")
      .select("*")
      .order("created_at", { ascending: true })
      .range(from, to), "ai_data_access_events"),
    readAllPages<SecurityRateLimitEventRow>((from, to) => supabase
      .from("security_rate_limit_events")
      .select("*")
      .order("occurred_at", { ascending: true })
      .range(from, to), "security_rate_limit_events"),
  ]);

  return { actionRuns, dataAccessEvents, projectRef, rateLimitEvents, toolCalls };
}

function writeEvidence(report: BackfillReport) {
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  writeFileSync(EVIDENCE_JSON, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(
    EVIDENCE_MD,
    [
      "# Cloudflare D1 AI Audit Backfill",
      "",
      `Generated: ${report.generatedAt}`,
      "",
      `- Source Supabase project: ${report.sourceProjectRef}`,
      `- Target D1 database: ${report.targetD1Database}`,
      `- Source AI action runs: ${report.sourceRows.aiActionRuns}`,
      `- Source AI tool calls: ${report.sourceRows.aiToolCalls}`,
      `- Source AI data access events: ${report.sourceRows.aiDataAccessEvents}`,
      `- Source security rate-limit events: ${report.sourceRows.securityRateLimitEvents}`,
      `- Source mode counts: ${JSON.stringify(report.sourceModeCounts)}`,
      `- Source status counts: ${JSON.stringify(report.sourceStatusCounts)}`,
      `- Source rate-limit scope counts: ${JSON.stringify(report.sourceRateLimitScopeCounts)}`,
      `- Wrangler exit code: ${report.wrangler.exitCode}`,
      `- D1 readback AI action runs: ${report.d1Readback.aiActionRuns ?? "(unknown)"}`,
      `- D1 readback AI tool calls: ${report.d1Readback.aiToolCalls ?? "(unknown)"}`,
      `- D1 readback AI data access events: ${report.d1Readback.aiDataAccessEvents ?? "(unknown)"}`,
      `- D1 readback security rate-limit events: ${report.d1Readback.securityRateLimitEvents ?? "(unknown)"}`,
      `- D1 backfill ready: ${report.readiness.d1BackfillReady}`,
      `- Blockers: ${report.blockers.length > 0 ? report.blockers.join("; ") : "none"}`,
      "",
      "No prompts, route context, tool args/results, user ids, workspace ids, key hashes, IP addresses, or secret values are stored in this evidence file.",
      "",
    ].join("\n"),
  );
}

async function main() {
  const generatedAt = new Date().toISOString();
  const targetD1Database = readEnv("ARCHESTIMATOR_D1_DATABASE") ?? DEFAULT_D1_DATABASE;
  const { actionRuns, dataAccessEvents, projectRef, rateLimitEvents, toolCalls } = await readSourceRows();
  const sourceRows = {
    aiActionRuns: actionRuns.length,
    aiToolCalls: toolCalls.length,
    aiDataAccessEvents: dataAccessEvents.length,
    securityRateLimitEvents: rateLimitEvents.length,
  };
  const totalRows = Object.values(sourceRows).reduce((sum, count) => sum + count, 0);
  const blockers: string[] = [];
  let wrangler = {
    args: ["wrangler", "d1", "execute", targetD1Database, "--remote", "--file", "<redacted-temp-sql-file>"],
    exitCode: totalRows === 0 ? 0 : null,
    signal: null,
    stdoutBytes: 0,
    stderrBytes: 0,
    timedOut: false,
  } satisfies CommandReport;

  if (totalRows > 0) {
    const tempDir = mkdtempSync(join(tmpdir(), "archestimator-ai-audit-d1-"));
    const tempSql = join(tempDir, "backfill.sql");
    try {
      writeFileSync(tempSql, buildUpsertSql({ actionRuns, dataAccessEvents, rateLimitEvents, toolCalls }));
      const result = spawnSync("bunx", ["wrangler", "d1", "execute", targetD1Database, "--remote", "--file", tempSql], {
        cwd: resolve("."),
        encoding: "utf8",
        timeout: 180_000,
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
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  }

  const upsertSucceeded = wrangler.exitCode === 0 && !wrangler.timedOut;
  if (!upsertSucceeded) blockers.push("Wrangler D1 AI audit upsert failed.");
  const d1Readback = readBackD1Rows(targetD1Database, sourceRows);
  if (!d1Readback.ready) blockers.push("D1 readback counts are below source counts or unavailable.");

  const report: BackfillReport = {
    generatedAt,
    mode: "cloudflare-d1-ai-audit-backfill",
    sourceProjectRef: projectRef,
    targetD1Database,
    sourceRows,
    sourceModeCounts: countBy(actionRuns, (row) => row.mode),
    sourceStatusCounts: countBy(actionRuns, (row) => row.status),
    sourceRateLimitScopeCounts: countBy(rateLimitEvents, (row) => row.scope),
    wrangler,
    d1Readback,
    readiness: {
      sourceProjectBoundaryReady: projectRef === EXPECTED_PROJECT_REF,
      upsertSucceeded,
      d1ReadbackReady: d1Readback.ready,
      d1BackfillReady: projectRef === EXPECTED_PROJECT_REF && upsertSucceeded && d1Readback.ready,
    },
    blockers,
    note: "Reads only metadata-only AI audit and security rate-limit rows from the Archestimator Supabase project, writes sanitized D1 rows through Wrangler, records counts only, and never stores raw prompts, tool args/results, key hashes, user ids, workspace ids, or secret values in evidence.",
  };

  writeEvidence(report);
  console.log(JSON.stringify(report, null, 2));
  if (!report.readiness.d1BackfillReady) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
