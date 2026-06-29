import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { emitLogRecord } from "@/lib/observability/logger";

const originalEnv = { ...process.env };
let tempDir: string;

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

  it("keeps single-record file writes under the pilot latency budget", () => {
    const durations: number[] = [];

    for (let index = 0; index < 1000; index += 1) {
      const start = performance.now();
      emitLogRecord({
        level: "error",
        event: "perf_probe",
        message: `Synthetic error ${index}`,
      });
      durations.push(performance.now() - start);
    }

    const sorted = [...durations].sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
    expect(p95).toBeLessThan(1);
  });
});
