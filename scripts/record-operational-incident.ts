#!/usr/bin/env bun

import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  buildOperationalIncidentRows,
  INCIDENT_STATUSES,
  type IncidentStatus,
  type BuiltOperationalIncident,
} from "../src/lib/observability/incident-record-core";
import {
  sendOperationalIncidentAlert,
  type OperationalIncidentAlertDeliveryResult,
  type OperationalIncidentAlertInput,
} from "../src/lib/observability/operational-alerts";
import { redactMessage } from "../src/lib/observability/redact";

type D1Scope = "local" | "remote";
type IncidentAction = "declare" | "note" | "status" | "close";

export type ParsedArgs = {
  action: IncidentAction;
  database: string;
  scope: D1Scope;
  dryRun: boolean;
  incidentId?: string;
  eventId?: string;
  severity?: string;
  status?: string;
  owner?: string;
  actor?: string;
  summary?: string;
  detail?: string;
  rootCause?: string;
  requestIds: string[];
  now: string;
};

export type OperationalIncidentRecordReport = {
  generatedAt: string;
  mode: "operational-incident-record";
  action: IncidentAction;
  dryRun: boolean;
  source: {
    database: string;
    scope: D1Scope;
  };
  incidentId: string;
  eventId: string;
  taintedFields: string[];
  command: {
    attempted: boolean;
    exitCode: number | null;
    signal: string | null;
    timedOut: boolean;
    stdoutBytes: number;
    stderrBytes: number;
  };
  alertDelivery: {
    attempted: boolean;
    delivered: boolean;
    skipped: boolean;
    required: boolean;
    reason: string | null;
    statusCode: number | null;
    webhookUrlRedacted: true;
    secretRedacted: true;
    payloadPathSafe: boolean;
    taintedFields: string[];
  };
  ready: boolean;
  note: string;
};

type RunOperationalIncidentRecordOptions = {
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
};

const DEFAULT_DATABASE = "ARCH_DB";
const SAFE_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

function takeFlag(args: string[], name: string) {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value`);
  args.splice(index, 2);
  return value;
}

function takeRepeatedFlag(args: string[], name: string) {
  const values: string[] = [];
  while (args.includes(name)) {
    const value = takeFlag(args, name);
    if (value) values.push(value);
  }
  return values;
}

function takeBooleanFlag(args: string[], name: string) {
  const index = args.indexOf(name);
  if (index === -1) return false;
  args.splice(index, 1);
  return true;
}

function normalizeAction(value: string | undefined): IncidentAction {
  if (value === "declare" || value === "note" || value === "status" || value === "close") return value;
  throw new Error("Usage: bun run ops:incident -- <declare|note|status|close> [flags]");
}

function normalizeScope(value: string | undefined): D1Scope {
  return value === "remote" ? "remote" : "local";
}

function assertSafeId(name: string, value: string) {
  if (!SAFE_ID_PATTERN.test(value)) throw new Error(`${name} must match ${SAFE_ID_PATTERN}`);
}

function required(name: string, value: string | undefined) {
  if (!value?.trim()) throw new Error(`${name} is required`);
  return value;
}

export function parseOperationalIncidentRecordArgs(argv: string[]): ParsedArgs {
  const args = [...argv];
  const action = normalizeAction(args.shift());
  const parsed: ParsedArgs = {
    action,
    database: takeFlag(args, "--database") ?? DEFAULT_DATABASE,
    scope: normalizeScope(takeFlag(args, "--scope")),
    dryRun: takeBooleanFlag(args, "--dry-run"),
    incidentId: takeFlag(args, "--incident-id") ?? takeFlag(args, "--id"),
    eventId: takeFlag(args, "--event-id"),
    severity: takeFlag(args, "--severity"),
    status: takeFlag(args, "--status"),
    owner: takeFlag(args, "--owner"),
    actor: takeFlag(args, "--actor"),
    summary: takeFlag(args, "--summary"),
    detail: takeFlag(args, "--detail"),
    rootCause: takeFlag(args, "--root-cause"),
    requestIds: takeRepeatedFlag(args, "--request-id"),
    now: takeFlag(args, "--now") ?? new Date().toISOString(),
  };

  if (args.length > 0) throw new Error(`Unknown argument(s): ${args.join(" ")}`);
  if (parsed.incidentId) assertSafeId("incident id", parsed.incidentId);
  if (parsed.eventId) assertSafeId("event id", parsed.eventId);
  return parsed;
}

function sqlString(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

function sqlNullable(value: string | null) {
  return value == null ? "NULL" : sqlString(value);
}

function redactRequired(field: string, value: string | undefined, taintedFields: string[]) {
  const redacted = redactMessage(required(field, value).trim());
  if (redacted.tainted) taintedFields.push(field);
  return redacted.value;
}

function redactOptional(field: string, value: string | undefined, taintedFields: string[]) {
  if (!value?.trim()) return null;
  const redacted = redactMessage(value.trim());
  if (redacted.tainted) taintedFields.push(field);
  return redacted.value;
}

function insertEventSql(input: {
  eventId: string;
  incidentId: string;
  occurredAt: string;
  eventKind: "declared" | "note" | "status_changed" | "closed";
  actor: string;
  detail: string;
}) {
  return `
INSERT INTO operational_incident_events (
  id, incident_id, occurred_at, event_kind, actor, detail
)
VALUES (
  ${sqlString(input.eventId)},
  ${sqlString(input.incidentId)},
  ${sqlString(input.occurredAt)},
  ${sqlString(input.eventKind)},
  ${sqlString(input.actor)},
  ${sqlString(input.detail)}
);
`;
}

export function buildDeclareIncidentSql(rows: BuiltOperationalIncident) {
  return `
BEGIN TRANSACTION;
INSERT INTO operational_incidents (
  id, declared_at, severity, status, owner, summary,
  root_cause, related_request_ids, closed_at
)
VALUES (
  ${sqlString(rows.incident.id)},
  ${sqlString(rows.incident.declared_at)},
  ${sqlString(rows.incident.severity)},
  ${sqlString(rows.incident.status)},
  ${sqlString(rows.incident.owner)},
  ${sqlString(rows.incident.summary)},
  ${sqlNullable(rows.incident.root_cause)},
  ${sqlString(rows.incident.related_request_ids)},
  ${sqlNullable(rows.incident.closed_at)}
);
${insertEventSql({
    eventId: rows.event.id,
    incidentId: rows.event.incident_id,
    occurredAt: rows.event.occurred_at,
    eventKind: "declared",
    actor: rows.event.actor,
    detail: rows.event.detail,
  })}
COMMIT;
`;
}

function buildCommandSql(parsed: ParsedArgs): { sql: string; incidentId: string; eventId: string; taintedFields: string[] } {
  if (parsed.action === "declare") {
    const rows = buildOperationalIncidentRows({
      id: parsed.incidentId,
      eventId: parsed.eventId,
      declaredAt: parsed.now,
      occurredAt: parsed.now,
      severity: required("--severity", parsed.severity) as Parameters<typeof buildOperationalIncidentRows>[0]["severity"],
      owner: required("--owner", parsed.owner),
      actor: parsed.actor,
      summary: required("--summary", parsed.summary),
      detail: parsed.detail,
      relatedRequestIds: parsed.requestIds,
    });
    return {
      sql: buildDeclareIncidentSql(rows),
      incidentId: rows.incident.id,
      eventId: rows.event.id,
      taintedFields: rows.taintedFields,
    };
  }

  const incidentId = required("--incident-id", parsed.incidentId);
  const eventId = parsed.eventId ?? crypto.randomUUID();
  const taintedFields: string[] = [];
  const actor = redactRequired("--actor", parsed.actor, taintedFields);
  const detail = redactRequired("--detail", parsed.detail ?? parsed.summary ?? parsed.rootCause, taintedFields);

  if (parsed.action === "note") {
    return {
      sql: insertEventSql({ eventId, incidentId, occurredAt: parsed.now, eventKind: "note", actor, detail }),
      incidentId,
      eventId,
      taintedFields,
    };
  }

  if (parsed.action === "status") {
    const status = required("--status", parsed.status);
    if (!INCIDENT_STATUSES.includes(status as IncidentStatus) || status === "closed") {
      throw new Error("--status must be one of open, contained, resolved. Use close for closed incidents.");
    }
    return {
      sql: `
BEGIN TRANSACTION;
UPDATE operational_incidents
SET status = ${sqlString(status)}
WHERE id = ${sqlString(incidentId)}
  AND status <> 'closed';
${insertEventSql({ eventId, incidentId, occurredAt: parsed.now, eventKind: "status_changed", actor, detail })}
COMMIT;
`,
      incidentId,
      eventId,
      taintedFields,
    };
  }

  const rootCause = redactOptional("--root-cause", parsed.rootCause ?? parsed.detail, taintedFields);
  return {
    sql: `
BEGIN TRANSACTION;
UPDATE operational_incidents
SET status = 'closed',
    root_cause = ${sqlNullable(rootCause)},
    closed_at = ${sqlString(parsed.now)}
WHERE id = ${sqlString(incidentId)};
${insertEventSql({ eventId, incidentId, occurredAt: parsed.now, eventKind: "closed", actor, detail })}
COMMIT;
`,
    incidentId,
    eventId,
    taintedFields,
  };
}

function executeD1Sql(parsed: ParsedArgs, sql: string) {
  if (parsed.dryRun) {
    return {
      attempted: false,
      exitCode: 0,
      signal: null,
      timedOut: false,
      stdoutBytes: Buffer.byteLength(sql),
      stderrBytes: 0,
    };
  }

  const dir = mkdtempSync(join(tmpdir(), "archestimator-incident-sql-"));
  const file = join(dir, "incident.sql");
  try {
    writeFileSync(file, sql);
    const result = spawnSync("bunx", [
      "wrangler",
      "d1",
      "execute",
      parsed.database,
      parsed.scope === "remote" ? "--remote" : "--local",
      "--file",
      file,
    ], {
      cwd: process.cwd(),
      encoding: "utf8",
      timeout: 30_000,
      maxBuffer: 1024 * 1024,
    });
    return {
      attempted: true,
      exitCode: result.status,
      signal: result.signal,
      timedOut: result.error?.message.includes("ETIMEDOUT") ?? false,
      stdoutBytes: Buffer.byteLength(result.stdout ?? ""),
      stderrBytes: Buffer.byteLength(result.stderr ?? ""),
    };
  } finally {
    rmSync(dir, { force: true, recursive: true });
  }
}

function readEnv(env: Record<string, string | undefined>, name: string) {
  return env[name]?.trim() ?? "";
}

function isAlertRequired(env: Record<string, string | undefined>) {
  return readEnv(env, "OPERATIONAL_INCIDENT_ALERTS_REQUIRED") === "1";
}

function alertDeliveryNotAttempted(reason: string, required = false): OperationalIncidentRecordReport["alertDelivery"] {
  return {
    attempted: false,
    delivered: false,
    skipped: true,
    required,
    reason,
    statusCode: null,
    webhookUrlRedacted: true,
    secretRedacted: true,
    payloadPathSafe: true,
    taintedFields: [],
  };
}

function summarizeAlertDelivery(
  result: OperationalIncidentAlertDeliveryResult,
  required: boolean,
): OperationalIncidentRecordReport["alertDelivery"] {
  return {
    attempted: !result.skipped,
    delivered: result.delivered,
    skipped: result.skipped,
    required,
    reason: result.delivered ? null : result.reason,
    statusCode: result.statusCode,
    webhookUrlRedacted: true,
    secretRedacted: true,
    payloadPathSafe: result.payloadPathSafe,
    taintedFields: result.taintedFields,
  };
}

export function buildOperationalIncidentAlertInput(
  parsed: ParsedArgs,
  report: Pick<OperationalIncidentRecordReport, "generatedAt" | "incidentId" | "eventId">,
): OperationalIncidentAlertInput {
  return {
    action: parsed.action,
    database: parsed.database,
    scope: parsed.scope,
    incidentId: report.incidentId,
    eventId: report.eventId,
    generatedAt: report.generatedAt,
    severity: parsed.severity,
    status: parsed.action === "close" ? "closed" : parsed.status,
    owner: parsed.owner,
    actor: parsed.actor,
    summary: parsed.summary,
    detail: parsed.detail,
    rootCause: parsed.rootCause,
    relatedRequestIds: parsed.requestIds,
  };
}

export function buildOperationalIncidentRecordReport(parsed: ParsedArgs): OperationalIncidentRecordReport {
  const built = buildCommandSql(parsed);
  const command = executeD1Sql(parsed, built.sql);
  const ready = command.exitCode === 0;
  return {
    generatedAt: new Date().toISOString(),
    mode: "operational-incident-record",
    action: parsed.action,
    dryRun: parsed.dryRun,
    source: {
      database: parsed.database,
      scope: parsed.scope,
    },
    incidentId: built.incidentId,
    eventId: built.eventId,
    taintedFields: [...new Set(built.taintedFields)],
    command,
    alertDelivery: alertDeliveryNotAttempted(parsed.dryRun ? "dry_run" : ready ? "not_attempted" : "command_failed"),
    ready,
    note: parsed.dryRun
      ? "Dry-run only. SQL was generated from redacted inputs but not executed."
      : "Operational incident mutation attempted through Wrangler D1. The report omits SQL text and raw command output.",
  };
}

export async function runOperationalIncidentRecord(
  parsed: ParsedArgs,
  options: RunOperationalIncidentRecordOptions = {},
): Promise<OperationalIncidentRecordReport> {
  const env = options.env ?? process.env;
  const alertRequired = isAlertRequired(env);
  const report = buildOperationalIncidentRecordReport(parsed);

  if (parsed.dryRun || report.command.exitCode !== 0) {
    return {
      ...report,
      alertDelivery: alertDeliveryNotAttempted(parsed.dryRun ? "dry_run" : "command_failed", alertRequired),
      ready: report.ready,
    };
  }

  const delivery = await sendOperationalIncidentAlert(buildOperationalIncidentAlertInput(parsed, report), {
    env,
    fetchImpl: options.fetchImpl,
  });
  const alertDelivery = summarizeAlertDelivery(delivery, alertRequired);
  const ready = report.ready && (!alertRequired || alertDelivery.delivered);

  return {
    ...report,
    alertDelivery,
    ready,
    note: `${report.note} Alert delivery is best-effort unless OPERATIONAL_INCIDENT_ALERTS_REQUIRED=1 is set.`,
  };
}

async function main() {
  const report = await runOperationalIncidentRecord(parseOperationalIncidentRecordArgs(process.argv.slice(2)));
  console.log(JSON.stringify(report, null, 2));
  if (!report.ready) process.exitCode = 1;
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
