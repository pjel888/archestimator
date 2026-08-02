import {
  appendFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { emitLogRecord } from "@/lib/observability/logger";

const originalEnv = { ...process.env };
const SAMPLE_COUNT = 500;
const CALIBRATED_HEALTHY_LOGGER_P95_MS = 10;
const CALIBRATED_HEALTHY_OVERHEAD_P95_MS = 5;
const CI_NOISE_HEADROOM_MULTIPLIER = 2;
const MAX_LOGGER_P95_MS =
  CALIBRATED_HEALTHY_LOGGER_P95_MS * CI_NOISE_HEADROOM_MULTIPLIER;
const MAX_LOGGER_OVERHEAD_P95_MS =
  CALIBRATED_HEALTHY_OVERHEAD_P95_MS * CI_NOISE_HEADROOM_MULTIPLIER;
let tempDir: string;

function measureDuration(action: () => void) {
  const start = performance.now();
  action();
  return performance.now() - start;
}

function percentile95(durations: number[]) {
  const sorted = [...durations].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length * 0.95)] ?? 0;
}

describe("dev NDJSON logger performance", () => {
  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "archestimator-logger-perf-"));
    process.env.ARCHESTIMATOR_DEV_LOG_PATH = join(tempDir, "dev.ndjson");
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

  it("keeps logger p95 bounded above the synchronous filesystem floor", () => {
    const rawPath = join(tempDir, "raw.ndjson");
    const rawLine = `${JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "ERROR",
      event: "perf_probe",
      message: "Synthetic error",
    })}\n`;
    const rawDurations: number[] = [];
    const loggerDurations: number[] = [];
    const writeRawRecord = () => {
      if (existsSync(rawPath)) statSync(rawPath);
      mkdirSync(tempDir, { recursive: true });
      appendFileSync(rawPath, rawLine, "utf8");
    };
    const writeLoggerRecord = (index: number) => {
      emitLogRecord({
        level: "error",
        event: "perf_probe",
        message: `Synthetic error ${index}`,
      });
    };

    writeRawRecord();
    writeLoggerRecord(-1);

    for (let index = 0; index < SAMPLE_COUNT; index += 1) {
      if (index % 2 === 0) {
        rawDurations.push(measureDuration(writeRawRecord));
        loggerDurations.push(measureDuration(() => writeLoggerRecord(index)));
      } else {
        loggerDurations.push(measureDuration(() => writeLoggerRecord(index)));
        rawDurations.push(measureDuration(writeRawRecord));
      }
    }

    const rawP95 = percentile95(rawDurations);
    const loggerP95 = percentile95(loggerDurations);
    expect(loggerP95).toBeLessThan(MAX_LOGGER_P95_MS);
    expect(loggerP95 - rawP95).toBeLessThan(MAX_LOGGER_OVERHEAD_P95_MS);
  });
});
