import { existsSync, readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { generateCloudflareD1RecoveryWorker } from "../../scripts/generate-cloudflare-d1-recovery-worker";

const runId = "recovery-20260712-z9y8x7w6";
const outputDirectory = resolve(".ai/99_scratch/cloudflare-d1-recovery", runId);

describe("Cloudflare D1 recovery worker generator", () => {
  it("writes only a no-route disposable overlay under scratch", () => {
    rmSync(outputDirectory, { recursive: true, force: true });
    try {
      const output = generateCloudflareD1RecoveryWorker({
        runId,
        disposableDatabaseName: "archestimator-recovery-20260712-z9y8x7w6",
        disposableDatabaseId: "disposable-database-id",
      });
      const worker = readFileSync(output.workerFile, "utf8");
      const config = JSON.parse(readFileSync(output.wranglerFile, "utf8")) as Record<string, unknown>;

      expect(output.outputDirectory).toBe(outputDirectory);
      expect(existsSync(output.workerFile)).toBe(true);
      expect(config.workers_dev).toBe(true);
      expect(config.routes).toEqual([]);
      expect(worker).toContain('url.pathname !== "/__recovery/probe"');
      expect(worker).toContain("readBodyWithLimit");
      expect(worker).toContain("constantTimeEqual(payload.runId, env.RECOVERY_EXPECTED_RUN_ID)");
      expect(worker).toContain("verifyHmac(signature, signedPayload, env.RECOVERY_PROBE_HMAC_KEY)");
      expect(worker).toContain("recovery_probe_nonces");
      expect(worker).toContain("recovery_probe_counters");
      expect(worker).toContain("count < 32");
      expect(worker).toContain("count < 5");
      expect(worker).toContain('database.prepare("SELECT 1 AS ready")');
      expect(worker).toContain('new Response(null, { status: 204');
      expect(worker).not.toContain("archestimator.com");
      expect(worker).not.toContain("RECOVERY_EXPECTED_RUN_ID=");
      expect(worker).not.toContain("test-signing-key");
    } finally {
      rmSync(outputDirectory, { recursive: true, force: true });
    }
  });

  it("rejects unsafe runs and non-disposable targets before writing", () => {
    for (const unsafeRunId of ["../unsafe", "..\\unsafe", "C:\\unsafe\\recovery-run"]) {
      expect(() => generateCloudflareD1RecoveryWorker({
        runId: unsafeRunId,
        disposableDatabaseName: "archestimator-recovery-unsafe",
        disposableDatabaseId: "id",
      }), unsafeRunId).toThrow("run ID");
    }
    expect(() => generateCloudflareD1RecoveryWorker({
      runId: "recovery-20260712-a1b2c3d4",
      disposableDatabaseName: "ARCH_DB",
      disposableDatabaseId: "id",
    })).toThrow("disposable database");
  });
});
