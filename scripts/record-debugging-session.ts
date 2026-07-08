#!/usr/bin/env bun

import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";

const DEFAULT_LEDGER_PATH = ".ai/10_state/error-debugging-ledger.ndjson";
const MAX_RECENT_MATCHES = 5;

const ENVIRONMENTS = ["local", "preview", "production", "test"] as const;
const STATUSES = ["observed", "investigating", "fixed", "mitigated", "wontfix"] as const;
const SEVERITIES = ["sev1", "sev2", "sev3", "sev4", "info"] as const;
const SOURCES = ["local-log", "workers-logs", "client-report", "d1-incident", "test", "manual"] as const;

type DebuggingEnvironment = (typeof ENVIRONMENTS)[number];
type DebuggingStatus = (typeof STATUSES)[number];
type DebuggingSeverity = (typeof SEVERITIES)[number];
type DebuggingSource = (typeof SOURCES)[number];

export type DebuggingSessionLedgerMatch = Pick<
  DebuggingSessionLedgerRecord,
  | "id"
  | "generatedAt"
  | "environment"
  | "status"
  | "severity"
  | "source"
  | "recurrenceKey"
  | "route"
  | "event"
  | "errorClass"
  | "errorCode"
  | "rootCause"
  | "fixSummary"
  | "validation"
>;

export type DebuggingSessionLedgerMatchSummary = {
  hasMatches: boolean;
  total: number;
  statusCounts: Partial<Record<DebuggingStatus, number>>;
  latest: DebuggingSessionLedgerMatch | null;
};

export type DebuggingSessionLedgerRecord = {
  id: string;
  generatedAt: string;
  mode: "debugging-session-ledger-record";
  proofBoundary: "redacted-agent-debugging-session-ledger";
  environment: DebuggingEnvironment;
  status: DebuggingStatus;
  severity: DebuggingSeverity;
  source: DebuggingSource;
  recurrenceKey: string;
  symptom: string;
  route: string | null;
  event: string | null;
  errorClass: string | null;
  errorCode: string | null;
  logRecordId: string | null;
  requestId: string | null;
  incidentId: string | null;
  rootCause: string | null;
  fixSummary: string | null;
  changedFiles: string[];
  validation: string[];
  followUps: string[];
  redaction: {
    rawSecretsStored: false;
    rawRequestBodiesStored: false;
    rawStackTracesStored: false;
  };
};

export type DebuggingSessionLedgerSnapshot = {
  path: string;
  exists: boolean;
  parsedRecords: number;
  malformedLines: number;
  unsafeRecords: number;
  latestErrorRecurrenceKey: string | null;
  matchingLatestErrorCount: number;
  latestErrorMatchSummary: DebuggingSessionLedgerMatchSummary;
  recentMatches: DebuggingSessionLedgerMatch[];
};

type BuildRecordInput = {
  id?: string;
  generatedAt?: string;
  environment: DebuggingEnvironment;
  status: DebuggingStatus;
  severity: DebuggingSeverity;
  source: DebuggingSource;
  symptom: string;
  route?: string | null;
  event?: string | null;
  errorClass?: string | null;
  errorCode?: string | null;
  logRecordId?: string | null;
  requestId?: string | null;
  incidentId?: string | null;
  rootCause?: string | null;
  fixSummary?: string | null;
  changedFiles?: string[];
  validation?: string[];
  followUps?: string[];
  recurrenceKey?: string;
};

type LatestErrorFingerprint = {
  environment?: DebuggingEnvironment;
  route?: string | null;
  event?: string | null;
  errorClass?: string | null;
  errorCode?: string | null;
};

function displayPath(path: string) {
  const relativePath = relative(process.cwd(), resolve(path));
  const display = relativePath && !relativePath.startsWith("..") ? relativePath : path;
  return display.split(sep).join("/");
}

function enumValue<T extends readonly string[]>(value: unknown, allowed: T, field: string): T[number] {
  if (typeof value === "string" && allowed.includes(value)) return value as T[number];
  throw new Error(`${field} must be one of: ${allowed.join(", ")}`);
}

function sensitiveStringScan(value: unknown) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  if (!text) return true;
  if (/Bearer\s+[A-Za-z0-9._~+/=-]{8,}/i.test(text)) return false;
  if (/(cf_clearance|better-auth\.session|session_token|password-reset|invite_token)=/i.test(text)) return false;
  if (/https?:\/\/[^\s"']+[?&](token|code|state|password|secret)=/i.test(text)) return false;
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text)) return false;
  return true;
}

function sanitizeText(value: unknown, field: string, maxLength = 700) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") throw new Error(`${field} must be a string`);
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > maxLength) throw new Error(`${field} must be <= ${maxLength} characters`);
  if (/[\u0000-\u001F\u007F]/.test(trimmed)) throw new Error(`${field} must not contain control characters`);
  if (!sensitiveStringScan(trimmed)) throw new Error(`${field} appears to contain raw sensitive material`);
  return trimmed;
}

function sanitizeReference(value: unknown, field: string) {
  const text = sanitizeText(value, field, 180);
  if (!text) return null;
  if (text.includes("?") || text.includes("#")) throw new Error(`${field} must not include query strings or fragments`);
  if (!/^[A-Za-z0-9_./:@[\]-]+$/.test(text)) throw new Error(`${field} contains unsafe characters`);
  return text;
}

function sanitizeRoute(value: unknown) {
  const route = sanitizeReference(value, "route");
  if (!route) return null;
  if (!route.startsWith("/")) throw new Error("route must be a path beginning with /");
  return route;
}

function sanitizeFilePath(value: unknown) {
  const path = sanitizeReference(value, "changed file");
  if (!path) return null;
  if (path.startsWith("/") || path.includes("../") || path === "..") {
    throw new Error("changed file must be a repo-relative path");
  }
  if (path.startsWith(".env") || path.includes("/.env")) {
    throw new Error("changed file must not point at env files");
  }
  return path;
}

function sanitizeTextList(values: unknown[] | undefined, field: string) {
  return (values ?? [])
    .map((value) => sanitizeText(value, field))
    .filter((value): value is string => Boolean(value));
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}

export function buildDebuggingRecurrenceKey(input: LatestErrorFingerprint) {
  const parts = [
    input.environment ?? "local",
    input.route ?? "no-route",
    input.event ?? "no-event",
    input.errorClass ?? "no-error-class",
    input.errorCode ?? "no-error-code",
  ];
  return `dbg_${createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 16)}`;
}

export function buildDebuggingSessionLedgerRecord(input: BuildRecordInput): DebuggingSessionLedgerRecord {
  const route = sanitizeRoute(input.route);
  const event = sanitizeReference(input.event, "event");
  const errorClass = sanitizeReference(input.errorClass, "error class");
  const errorCode = sanitizeReference(input.errorCode, "error code");
  const environment = enumValue(input.environment, ENVIRONMENTS, "environment");
  const record: DebuggingSessionLedgerRecord = {
    id: sanitizeReference(input.id, "id") ?? `debug-${randomUUID()}`,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    mode: "debugging-session-ledger-record",
    proofBoundary: "redacted-agent-debugging-session-ledger",
    environment,
    status: enumValue(input.status, STATUSES, "status"),
    severity: enumValue(input.severity, SEVERITIES, "severity"),
    source: enumValue(input.source, SOURCES, "source"),
    recurrenceKey: sanitizeReference(input.recurrenceKey, "recurrence key") ?? buildDebuggingRecurrenceKey({
      environment,
      route,
      event,
      errorClass,
      errorCode,
    }),
    symptom: sanitizeText(input.symptom, "symptom") ?? "",
    route,
    event,
    errorClass,
    errorCode,
    logRecordId: sanitizeReference(input.logRecordId, "log record id"),
    requestId: sanitizeReference(input.requestId, "request id"),
    incidentId: sanitizeReference(input.incidentId, "incident id"),
    rootCause: sanitizeText(input.rootCause, "root cause"),
    fixSummary: sanitizeText(input.fixSummary, "fix summary"),
    changedFiles: unique((input.changedFiles ?? []).map(sanitizeFilePath).filter((value): value is string => Boolean(value))),
    validation: unique(sanitizeTextList(input.validation, "validation")),
    followUps: unique(sanitizeTextList(input.followUps, "follow up")),
    redaction: {
      rawSecretsStored: false,
      rawRequestBodiesStored: false,
      rawStackTracesStored: false,
    },
  };

  if (!record.symptom) throw new Error("symptom is required");
  if (!Number.isFinite(Date.parse(record.generatedAt))) throw new Error("generatedAt must be an ISO timestamp");
  if (!sensitiveStringScan(record)) throw new Error("record appears to contain raw sensitive material");
  return record;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isDebuggingSessionLedgerRecord(value: unknown): value is DebuggingSessionLedgerRecord {
  return (
    isRecord(value)
    && value.mode === "debugging-session-ledger-record"
    && value.proofBoundary === "redacted-agent-debugging-session-ledger"
    && typeof value.id === "string"
    && typeof value.generatedAt === "string"
    && typeof value.recurrenceKey === "string"
  );
}

function parseLedger(path: string) {
  const records: DebuggingSessionLedgerRecord[] = [];
  let malformedLines = 0;
  let unsafeRecords = 0;
  if (!existsSync(path)) return { records, malformedLines, unsafeRecords };

  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (!isDebuggingSessionLedgerRecord(parsed)) {
        malformedLines += 1;
      } else if (!sensitiveStringScan(parsed)) {
        unsafeRecords += 1;
      } else {
        records.push(parsed);
      }
    } catch {
      malformedLines += 1;
    }
  }

  return { records, malformedLines, unsafeRecords };
}

export function buildDebuggingSessionLedgerSnapshot(options: {
  ledgerPath?: string;
  latestError?: LatestErrorFingerprint | null;
} = {}): DebuggingSessionLedgerSnapshot {
  const ledgerPath = resolve(options.ledgerPath || process.env.DEBUGGING_SESSION_LEDGER_PATH || DEFAULT_LEDGER_PATH);
  const { records, malformedLines, unsafeRecords } = parseLedger(ledgerPath);
  const recurrenceKey = options.latestError ? buildDebuggingRecurrenceKey({
    environment: options.latestError.environment ?? "local",
    route: options.latestError.route,
    event: options.latestError.event,
    errorClass: options.latestError.errorClass,
    errorCode: options.latestError.errorCode,
  }) : null;
  const matches = recurrenceKey ? records.filter((record) => record.recurrenceKey === recurrenceKey) : [];
  const statusCounts = matches.reduce<Partial<Record<DebuggingStatus, number>>>((counts, record) => {
    counts[record.status] = (counts[record.status] ?? 0) + 1;
    return counts;
  }, {});
  const recentMatches = matches
    .slice(-MAX_RECENT_MATCHES)
    .reverse()
    .map((record) => ({
      id: record.id,
      generatedAt: record.generatedAt,
      environment: record.environment,
      status: record.status,
      severity: record.severity,
      source: record.source,
      recurrenceKey: record.recurrenceKey,
      route: record.route,
      event: record.event,
      errorClass: record.errorClass,
      errorCode: record.errorCode,
      rootCause: record.rootCause,
      fixSummary: record.fixSummary,
      validation: record.validation,
    }));

  return {
    path: displayPath(ledgerPath),
    exists: existsSync(ledgerPath),
    parsedRecords: records.length,
    malformedLines,
    unsafeRecords,
    latestErrorRecurrenceKey: recurrenceKey,
    matchingLatestErrorCount: matches.length,
    latestErrorMatchSummary: {
      hasMatches: matches.length > 0,
      total: matches.length,
      statusCounts,
      latest: recentMatches[0] ?? null,
    },
    recentMatches,
  };
}

export function appendDebuggingSessionLedgerRecord(record: DebuggingSessionLedgerRecord, ledgerPath = DEFAULT_LEDGER_PATH) {
  const resolved = resolve(ledgerPath);
  mkdirSync(dirname(resolved), { recursive: true });
  appendFileSync(resolved, `${JSON.stringify(record)}\n`, "utf8");
  return resolved;
}

type ParsedArgs = {
  values: Record<string, string[]>;
  flags: Set<string>;
};

function parseArgs(argv: string[]): ParsedArgs {
  const values: Record<string, string[]> = {};
  const flags = new Set<string>();
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) throw new Error(`Unexpected argument: ${arg}`);
    const key = arg.slice(2);
    if (["dry-run", "json", "check"].includes(key)) {
      flags.add(key);
      continue;
    }
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for --${key}`);
    values[key] = [...(values[key] ?? []), value];
    index += 1;
  }
  return { values, flags };
}

function first(values: Record<string, string[]>, key: string) {
  return values[key]?.[0];
}

function list(values: Record<string, string[]>, key: string) {
  return values[key] ?? [];
}

function recordFromArgs(args: ParsedArgs) {
  return buildDebuggingSessionLedgerRecord({
    id: first(args.values, "id"),
    generatedAt: first(args.values, "now"),
    environment: enumValue(first(args.values, "environment") ?? "local", ENVIRONMENTS, "environment"),
    status: enumValue(first(args.values, "status") ?? "observed", STATUSES, "status"),
    severity: enumValue(first(args.values, "severity") ?? "info", SEVERITIES, "severity"),
    source: enumValue(first(args.values, "source") ?? "manual", SOURCES, "source"),
    recurrenceKey: first(args.values, "recurrence-key"),
    symptom: first(args.values, "symptom") ?? "",
    route: first(args.values, "route"),
    event: first(args.values, "event"),
    errorClass: first(args.values, "error-class"),
    errorCode: first(args.values, "error-code"),
    logRecordId: first(args.values, "log-record-id"),
    requestId: first(args.values, "request-id"),
    incidentId: first(args.values, "incident-id"),
    rootCause: first(args.values, "root-cause"),
    fixSummary: first(args.values, "fix"),
    changedFiles: list(args.values, "changed-file"),
    validation: list(args.values, "validation"),
    followUps: list(args.values, "follow-up"),
  });
}

function readLedgerPath(args: ParsedArgs) {
  return first(args.values, "ledger") || process.env.DEBUGGING_SESSION_LEDGER_PATH || DEFAULT_LEDGER_PATH;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const ledgerPath = readLedgerPath(args);
  if (args.flags.has("check")) {
    const snapshot = buildDebuggingSessionLedgerSnapshot({ ledgerPath });
    console.log(JSON.stringify(snapshot, null, 2));
    if (snapshot.malformedLines > 0 || snapshot.unsafeRecords > 0) process.exit(1);
    return;
  }

  const record = recordFromArgs(args);
  if (!args.flags.has("dry-run")) appendDebuggingSessionLedgerRecord(record, ledgerPath);
  if (args.flags.has("json") || args.flags.has("dry-run")) {
    console.log(JSON.stringify(record, null, 2));
  } else {
    console.log(`Debugging session recorded: ${record.id}; recurrenceKey=${record.recurrenceKey}; ledger=${displayPath(ledgerPath)}`);
  }
}

if (import.meta.main) {
  main();
}
