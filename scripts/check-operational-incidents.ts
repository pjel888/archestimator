#!/usr/bin/env bun

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { INCIDENT_SEVERITIES, type IncidentSeverity, type IncidentStatus } from "../src/lib/observability/incident-record-core";

type D1Scope = "local" | "remote";

type WranglerQueryOptions = {
  database: string;
  scope: D1Scope;
};

export type WranglerQueryResult = {
  exitCode: number | null;
  signal: string | null;
  timedOut: boolean;
  stdoutBytes: number;
  stderrBytes: number;
  parsedJson: boolean;
  results: Array<{ results?: unknown[]; success?: boolean }> | null;
};

export type RawIncidentRow = {
  id?: unknown;
  severity?: unknown;
  status?: unknown;
  owner?: unknown;
  summary?: unknown;
  declared_at?: unknown;
  closed_at?: unknown;
};

export type IncidentResolveThresholdHours = Record<IncidentSeverity, number>;

export type OperationalIncidentStatusRow = {
  id: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  owner: string;
  summary: string;
  declaredAt: string;
  closedAt: string | null;
  ageHours: number | null;
  resolveSlaHours: number;
  stale: boolean;
};

export type OperationalIncidentsReadinessReport = {
  generatedAt: string;
  mode: "operational-incidents-readiness";
  source: {
    database: string;
    scope: D1Scope;
  };
  thresholdsHours: IncidentResolveThresholdHours;
  tableRead: {
    attempted: boolean;
    commandExitCode: number | null;
    parsedJson: boolean;
    incidentTablesReady: boolean;
    foundTables: string[];
  };
  incidentRows: OperationalIncidentStatusRow[];
  staleIncidents: Array<Pick<OperationalIncidentStatusRow, "id" | "severity" | "status" | "declaredAt" | "ageHours" | "resolveSlaHours">>;
  missing: string[];
  readiness: {
    incidentTablesReady: boolean;
    noStaleIncidents: boolean;
    operationalIncidentsReady: boolean;
  };
  note: string;
};

const DEFAULT_DATABASE = "ARCH_DB";
const DEFAULT_THRESHOLDS: IncidentResolveThresholdHours = {
  sev1: 4,
  sev2: 24,
  sev3: 120,
};

const INCIDENT_STATUS_SQL = `
SELECT name
FROM sqlite_master
WHERE type = 'table'
  AND name IN ('operational_incidents', 'operational_incident_events')
ORDER BY name;

SELECT id, severity, status, owner, summary, declared_at, closed_at
FROM operational_incidents
WHERE status IN ('open', 'contained', 'resolved')
ORDER BY declared_at ASC
LIMIT 100;
`;

function readEnv(name: string) {
  const value = process.env[name];
  return value?.trim() || undefined;
}

function parseScope(value: string | undefined): D1Scope {
  return value === "remote" ? "remote" : "local";
}

function parsePositiveHours(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function readIncidentResolveThresholds(env: Record<string, string | undefined> = process.env): IncidentResolveThresholdHours {
  return {
    sev1: parsePositiveHours(env.OPERATIONAL_INCIDENT_SEV1_RESOLVE_SLA_HOURS, DEFAULT_THRESHOLDS.sev1),
    sev2: parsePositiveHours(env.OPERATIONAL_INCIDENT_SEV2_RESOLVE_SLA_HOURS, DEFAULT_THRESHOLDS.sev2),
    sev3: parsePositiveHours(env.OPERATIONAL_INCIDENT_SEV3_RESOLVE_SLA_HOURS, DEFAULT_THRESHOLDS.sev3),
  };
}

export function parseWranglerD1JsonOutput(stdout: string): Array<{ results?: unknown[]; success?: boolean }> | null {
  const trimmed = stdout.trim();
  for (let index = 0; index < trimmed.length; index += 1) {
    if (trimmed[index] !== "[") continue;
    try {
      const parsed = JSON.parse(trimmed.slice(index)) as unknown;
      if (Array.isArray(parsed)) return parsed as Array<{ results?: unknown[]; success?: boolean }>;
    } catch (error) {
      if (!(error instanceof SyntaxError)) return null;
      // Keep scanning; Wrangler prints human-readable prelude lines before JSON.
    }
  }
  return null;
}

function isIncidentSeverity(value: unknown): value is IncidentSeverity {
  return typeof value === "string" && INCIDENT_SEVERITIES.includes(value as IncidentSeverity);
}

function isIncidentStatus(value: unknown): value is IncidentStatus {
  return value === "open" || value === "contained" || value === "resolved" || value === "closed";
}

function asText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function computeAgeHours(declaredAt: string, nowMs: number) {
  const declaredMs = Date.parse(declaredAt);
  if (!Number.isFinite(declaredMs)) return null;
  return Math.max(0, Math.floor((nowMs - declaredMs) / 3_600_000));
}

export function normalizeIncidentStatusRows(
  rows: RawIncidentRow[],
  thresholds: IncidentResolveThresholdHours,
  now = new Date(),
): OperationalIncidentStatusRow[] {
  const nowMs = now.getTime();
  return rows
    .filter((row) => isIncidentSeverity(row.severity) && isIncidentStatus(row.status) && typeof row.id === "string")
    .map((row) => {
      const severity = row.severity as IncidentSeverity;
      const status = row.status as IncidentStatus;
      const declaredAt = asText(row.declared_at);
      const ageHours = computeAgeHours(declaredAt, nowMs);
      const resolveSlaHours = thresholds[severity];
      const stale = (status === "open" || status === "contained") && ageHours !== null && ageHours > resolveSlaHours;
      return {
        id: row.id as string,
        severity,
        status,
        owner: asText(row.owner),
        summary: asText(row.summary),
        declaredAt,
        closedAt: typeof row.closed_at === "string" ? row.closed_at : null,
        ageHours,
        resolveSlaHours,
        stale,
      };
    });
}

function extractTableNames(results: Array<{ results?: unknown[] }> | null) {
  return (results?.[0]?.results ?? [])
    .map((row) => row && typeof row === "object" && "name" in row ? String((row as { name?: unknown }).name) : "")
    .filter(Boolean)
    .sort();
}

function extractIncidentRows(results: Array<{ results?: unknown[] }> | null): RawIncidentRow[] {
  return (results?.[1]?.results ?? []).filter((row): row is RawIncidentRow => Boolean(row && typeof row === "object"));
}

function runWranglerIncidentStatusQuery(options: WranglerQueryOptions): WranglerQueryResult {
  const args = [
    "wrangler",
    "d1",
    "execute",
    options.database,
    options.scope === "remote" ? "--remote" : "--local",
    "--command",
    INCIDENT_STATUS_SQL,
  ];
  const result = spawnSync("bunx", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    timeout: 30_000,
    maxBuffer: 1024 * 1024,
  });
  const parsed = parseWranglerD1JsonOutput(result.stdout ?? "");
  return {
    exitCode: result.status,
    signal: result.signal,
    timedOut: result.error?.message.includes("ETIMEDOUT") ?? false,
    stdoutBytes: Buffer.byteLength(result.stdout ?? ""),
    stderrBytes: Buffer.byteLength(result.stderr ?? ""),
    parsedJson: Boolean(parsed),
    results: parsed,
  };
}

export function buildOperationalIncidentsReadinessReport(
  input: {
    database?: string;
    scope?: D1Scope;
    thresholds?: IncidentResolveThresholdHours;
    commandResult?: WranglerQueryResult;
    now?: Date;
  } = {},
): OperationalIncidentsReadinessReport {
  const database = input.database ?? DEFAULT_DATABASE;
  const scope = input.scope ?? "local";
  const thresholds = input.thresholds ?? DEFAULT_THRESHOLDS;
  const commandResult = input.commandResult ?? runWranglerIncidentStatusQuery({ database, scope });
  const foundTables = extractTableNames(commandResult.results);
  const incidentTablesReady = foundTables.includes("operational_incident_events") && foundTables.includes("operational_incidents");
  const incidentRows = normalizeIncidentStatusRows(extractIncidentRows(commandResult.results), thresholds, input.now);
  const staleIncidents = incidentRows
    .filter((row) => row.stale)
    .map(({ id, severity, status, declaredAt, ageHours, resolveSlaHours }) => ({
      id,
      severity,
      status,
      declaredAt,
      ageHours,
      resolveSlaHours,
    }));

  const missing = [
    commandResult.exitCode !== 0 ? "incident_status_query_failed" : null,
    !commandResult.parsedJson ? "incident_status_query_json" : null,
    !incidentTablesReady ? "incident_tables" : null,
    ...staleIncidents.map((row) => `stale_incident:${row.id}`),
  ].filter((value): value is string => Boolean(value));

  return {
    generatedAt: new Date().toISOString(),
    mode: "operational-incidents-readiness",
    source: {
      database,
      scope,
    },
    thresholdsHours: thresholds,
    tableRead: {
      attempted: true,
      commandExitCode: commandResult.exitCode,
      parsedJson: commandResult.parsedJson,
      incidentTablesReady,
      foundTables,
    },
    incidentRows,
    staleIncidents,
    missing,
    readiness: {
      incidentTablesReady,
      noStaleIncidents: staleIncidents.length === 0,
      operationalIncidentsReady: missing.length === 0,
    },
    note: "Read-only operational incident readiness. It checks D1 incident-table presence and flags open/contained incidents older than the configured resolve-SLA thresholds. It does not query Workers Logs, send alerts, mutate incidents, or prove hosted alert delivery.",
  };
}

function writeOutput(outputFile: string, report: OperationalIncidentsReadinessReport) {
  const resolved = resolve(outputFile);
  mkdirSync(dirname(resolved), { recursive: true });
  writeFileSync(resolved, `${JSON.stringify(report, null, 2)}\n`);
}

function readFixtureReport(file: string): OperationalIncidentsReadinessReport {
  if (!existsSync(file)) throw new Error(`Incident readiness fixture not found: ${file}`);
  return JSON.parse(readFileSync(file, "utf8")) as OperationalIncidentsReadinessReport;
}

async function main() {
  const fixtureFile = readEnv("OPERATIONAL_INCIDENTS_FIXTURE_FILE");
  const report = fixtureFile
    ? readFixtureReport(fixtureFile)
    : buildOperationalIncidentsReadinessReport({
      database: readEnv("OPERATIONAL_INCIDENTS_D1_DATABASE") ?? DEFAULT_DATABASE,
      scope: parseScope(readEnv("OPERATIONAL_INCIDENTS_D1_SCOPE")),
      thresholds: readIncidentResolveThresholds(),
    });

  const outputFile = readEnv("OPERATIONAL_INCIDENTS_OUTPUT_FILE") ?? readEnv("OUTPUT_FILE");
  if (outputFile) writeOutput(outputFile, report);
  console.log(JSON.stringify(report, null, 2));
  if (!report.readiness.operationalIncidentsReady) process.exitCode = 1;
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
