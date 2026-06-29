import { appendFileSync, existsSync, mkdirSync, renameSync, rmSync, statSync } from "node:fs";
import { dirname, join } from "node:path";

import { isAppError, normalizeAppError, serializeErrorCauseForLog, type AppLogLevel } from "./app-error";
import { redactForLog } from "./redact";

export type LogRecord = {
  timestamp: string;
  level: AppLogLevel;
  event: string;
  message: string;
  action?: string;
  request_id?: string;
  error?: Record<string, unknown>;
  context?: unknown;
  tainted_fields?: string[];
};

export type AppLogger = {
  log: (record: LogRecord) => void | Promise<void>;
};

type DevLogLevel = "INFO" | "WARN" | "ERROR";

type DevLogRecord = Omit<LogRecord, "level" | "timestamp"> & {
  record_id: string;
  timestamp: string;
  level: DevLogLevel;
  severity_number: number;
};

type LogAppErrorOptions = {
  action?: string;
  context?: unknown;
  event: string;
  logger?: AppLogger;
  requestId?: string;
};

const SEVERITY_BY_LEVEL: Record<AppLogLevel, number> = {
  info: 9,
  warn: 13,
  error: 17,
};
const sessionStartedPaths = new Set<string>();
let processCounter = 0;

function readDevLogPath() {
  return process.env.ARCHESTIMATOR_DEV_LOG_PATH ?? join(process.cwd(), "logs", "dev.ndjson");
}

function readMaxBytes() {
  const parsed = Number(process.env.ARCHESTIMATOR_DEV_LOG_MAX_BYTES);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 50 * 1024 * 1024;
}

function shouldWriteDevLog() {
  if (process.env.ARCHESTIMATOR_DEV_LOG_DISABLED === "1") return false;
  return process.env.NODE_ENV !== "production" || Boolean(process.env.ARCHESTIMATOR_DEV_LOG_PATH);
}

function workerId() {
  return process.env.DEV_LOG_WORKER_ID ?? process.env.LOGGER_WORKER_ID ?? `pid${process.pid}`;
}

function devSessionId() {
  return process.env.DEV_SESSION_ID ?? `ppid${process.ppid}`;
}

function makeRecordId(timestamp: string) {
  processCounter += 1;
  return `${timestamp}-${workerId()}-${processCounter}`;
}

function devLevel(level: AppLogLevel): DevLogLevel {
  if (level === "error") return "ERROR";
  if (level === "warn") return "WARN";
  return "INFO";
}

function appendRawDevRecord(path: string, record: DevLogRecord) {
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, `${JSON.stringify(record)}\n`, "utf8");
}

function buildDevRecord(record: LogRecord): DevLogRecord {
  const redacted = redactForLog(record);
  const safeRecord = redacted.value as LogRecord;
  const timestamp = new Date().toISOString();
  const taintedFields = Array.from(new Set([...(safeRecord.tainted_fields ?? []), ...redacted.taintedFields]));
  return {
    ...safeRecord,
    timestamp,
    record_id: makeRecordId(timestamp),
    level: devLevel(safeRecord.level),
    severity_number: SEVERITY_BY_LEVEL[safeRecord.level],
    tainted_fields: taintedFields.length ? taintedFields : undefined,
  };
}

function serializeStack(stack?: string) {
  if (!stack) return undefined;
  return stack.split("\n").slice(0, 50);
}

function buildSessionStartRecord(): DevLogRecord {
  const timestamp = new Date().toISOString();
  return {
    record_id: makeRecordId(timestamp),
    timestamp,
    level: "INFO",
    severity_number: 9,
    event: "session_start",
    message: "Dev log session started",
    context: {
      dev_session_id: devSessionId(),
      worker_id: workerId(),
      deployment_environment: process.env.NODE_ENV ?? "development",
    },
  };
}

function buildRotationRecord(path: string): DevLogRecord {
  const timestamp = new Date().toISOString();
  return {
    record_id: makeRecordId(timestamp),
    timestamp,
    level: "WARN",
    severity_number: 13,
    event: "log_rotation",
    message: "Dev log rotated at 50MB; older entries moved to dev.ndjson.1",
    context: {
      path,
    },
  };
}

function rotateIfNeeded(path: string) {
  if (!existsSync(path)) return;
  if (statSync(path).size <= readMaxBytes()) return;
  appendRawDevRecord(path, buildRotationRecord(path));
  rmSync(`${path}.1`, { force: true });
  renameSync(path, `${path}.1`);
  sessionStartedPaths.delete(path);
}

function ensureSessionStarted(path: string) {
  if (sessionStartedPaths.has(path)) return;
  appendRawDevRecord(path, buildSessionStartRecord());
  sessionStartedPaths.add(path);
}

function writeDevLogRecord(record: LogRecord) {
  if (!shouldWriteDevLog()) return;
  const path = readDevLogPath();
  rotateIfNeeded(path);
  ensureSessionStarted(path);
  appendRawDevRecord(path, buildDevRecord(record));
}

export const consoleAppLogger: AppLogger = {
  log(record) {
    writeDevLogRecord(record);
    const line = JSON.stringify(record);
    if (record.level === "error") {
      console.error(line);
      return;
    }
    if (record.level === "warn") {
      console.warn(line);
      return;
    }
    console.info(line);
  },
};

export function emitLogRecord(record: Omit<LogRecord, "timestamp"> & { timestamp?: string }) {
  consoleAppLogger.log({
    ...record,
    timestamp: record.timestamp ?? new Date().toISOString(),
  });
}

export function buildErrorLogRecord(error: unknown, options: Omit<LogAppErrorOptions, "logger">): LogRecord {
  const appError = normalizeAppError(error);
  const rawRecord = {
    timestamp: new Date().toISOString(),
    level: appError.toLogLevel(),
    event: options.event,
    message: appError.message,
    action: options.action,
    request_id: options.requestId,
    error: {
      name: appError.name,
      class: appError.name,
      kind: appError.kind,
      code: appError.code,
      message: appError.message,
      status_code: appError.statusCode,
      stack: serializeStack(appError.stack),
      cause: isAppError(error)
        ? error.cause === undefined
          ? undefined
          : serializeErrorCauseForLog(error.cause)
        : serializeErrorCauseForLog(error),
    },
    context: options.context,
  } satisfies Omit<LogRecord, "tainted_fields">;

  const redacted = redactForLog(rawRecord);
  const record = redacted.value as LogRecord;
  if (redacted.tainted) record.tainted_fields = redacted.taintedFields;
  return record;
}

export function logAppError(error: unknown, options: LogAppErrorOptions) {
  const logger = options.logger ?? consoleAppLogger;
  logger.log(buildErrorLogRecord(error, options));
}

export type { DevLogRecord };
