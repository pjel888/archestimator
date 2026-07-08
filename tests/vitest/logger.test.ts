import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { consoleAppLogger, emitLogRecord } from "@/lib/observability/logger";

const originalEnv = { ...process.env };
let tempDir: string;
let logPath: string;

function readRecords() {
  return readFileSync(logPath, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function readDefaultDevLogSize() {
  const defaultLogPath = join(process.cwd(), "logs", "dev.ndjson");
  return existsSync(defaultLogPath) ? statSync(defaultLogPath).size : null;
}

describe("dev NDJSON logger", () => {
  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "archestimator-logs-"));
    logPath = join(tempDir, "dev.ndjson");
    process.env.ARCHESTIMATOR_DEV_LOG_PATH = logPath;
    process.env.ARCHESTIMATOR_DEV_LOG_MAX_BYTES = String(1024 * 1024);
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
    rmSync(tempDir, { force: true, recursive: true });
  });

  it("writes session-start plus one valid NDJSON record per log call", () => {
    emitLogRecord({
      level: "error",
      event: "test_error",
      message: "Synthetic failure",
      context: { route: "/workshop" },
    });

    const records = readRecords();
    expect(records).toHaveLength(2);
    expect(records[0]).toMatchObject({
      level: "INFO",
      message: "Dev log session started",
      severity_number: 9,
    });
    expect(records[1]).toMatchObject({
      level: "ERROR",
      severity_number: 17,
      event: "test_error",
      message: "Synthetic failure",
      context: { route: "/workshop" },
    });
    expect(records[1].record_id).toEqual(expect.stringContaining("-pid"));
  });

  it("does not write to the default dev log during tests without an explicit path", () => {
    delete process.env.ARCHESTIMATOR_DEV_LOG_PATH;
    process.env.NODE_ENV = "test";
    const beforeSize = readDefaultDevLogSize();

    emitLogRecord({
      level: "error",
      event: "test_noise_probe",
      message: "Synthetic test error should stay out of the default dev log",
    });

    expect(readDefaultDevLogSize()).toBe(beforeSize);
  });

  it("still writes during tests when a dev log path is explicit", () => {
    process.env.NODE_ENV = "test";

    emitLogRecord({
      level: "error",
      event: "explicit_test_log_path_probe",
      message: "Synthetic test error should use the explicit dev log path",
    });

    expect(readRecords().at(-1)).toMatchObject({
      event: "explicit_test_log_path_probe",
      level: "ERROR",
    });
  });

  it("redacts log record fields before writing", () => {
    emitLogRecord({
      level: "error",
      event: "test_error",
      message: "Token failed",
      context: {
        message: "Bearer provider-secret for philip@example.com",
        access_token: "raw-token",
      },
    });

    const serialized = readFileSync(logPath, "utf8");
    expect(serialized).not.toMatch(/provider-secret|philip@example.com|raw-token/i);
    const records = readRecords();
    expect(records[1].tainted_fields).toEqual(expect.arrayContaining(["context.message", "context.access_token"]));
  });

  it("appends session-start without truncating existing logs", () => {
    writeFileSync(logPath, `${JSON.stringify({ record_id: "existing", message: "keep me" })}\n`);

    emitLogRecord({
      level: "warn",
      event: "test_warn",
      message: "New warning",
    });

    const lines = readFileSync(logPath, "utf8").trim().split("\n");
    expect(JSON.parse(lines[0] ?? "{}")).toEqual({ record_id: "existing", message: "keep me" });
    expect(lines).toHaveLength(3);
  });

  it("rotates when the log exceeds the configured cap", () => {
    process.env.ARCHESTIMATOR_DEV_LOG_MAX_BYTES = "10";
    writeFileSync(logPath, `${"x".repeat(64)}\n`);

    emitLogRecord({
      level: "error",
      event: "rotation_probe",
      message: "After rotate",
    });

    expect(readFileSync(`${logPath}.1`, "utf8")).toContain("Dev log rotated");
    const records = readRecords();
    expect(records.at(-1)).toMatchObject({
      event: "rotation_probe",
      level: "ERROR",
    });
  });

  it("console logger also writes the dev file", () => {
    consoleAppLogger.log({
      timestamp: new Date().toISOString(),
      level: "info",
      event: "console_probe",
      message: "Console probe",
    });

    expect(readRecords().at(-1)).toMatchObject({
      event: "console_probe",
      level: "INFO",
    });
  });
});
