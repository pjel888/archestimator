import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildCloudflareProviderResourceReadbackReport,
  type ProviderResourceCommandResult,
  writeMarkdown,
} from "../../scripts/check-cloudflare-provider-resources";

const WRANGLER_CONFIG = JSON.stringify({
  name: "archestimator-proof",
  d1_databases: [{ database_name: "archestimator-proof-db" }],
  r2_buckets: [{
    bucket_name: "archestimator-proof-uploads",
    preview_bucket_name: "archestimator-proof-uploads-dev",
  }],
  queues: {
    producers: [{ queue: "archestimator-upload-jobs" }],
    consumers: [{
      queue: "archestimator-upload-jobs",
      dead_letter_queue: "archestimator-upload-jobs-dlq",
    }],
  },
});

const WORKER_READINESS = {
  providerSecretList: {
    deployedWorkerSecrets: {
      required: ["CRON_SECRET", "PUBLICATION_TOKEN_HASH_SECRET"],
    },
  },
};

const AUTHENTICATED = {
  readiness: {
    wranglerApiAuthenticated: true,
    providerReadbackReady: true,
  },
};

function commandFixture(
  foundNames: string[],
  options: {
    minRecordCount?: number;
    parsedRecordCount?: number;
  } = {},
): ProviderResourceCommandResult {
  const parsedRecordCount = options.parsedRecordCount ?? foundNames.length;
  const minRecordCount = options.minRecordCount ?? null;
  return {
    key: "d1",
    label: "fixture",
    args: ["fixture"],
    readOnly: true,
    skipped: false,
    skipReason: null,
    exitCode: 0,
    signal: null,
    timedOut: false,
    stdoutBytes: 128,
    stderrBytes: 0,
    parsedJson: true,
    parsedRecordCount,
    minRecordCount,
    recordCountReady: minRecordCount === null ? null : parsedRecordCount >= minRecordCount,
    expectedNames: foundNames,
    foundExpectedNames: foundNames,
    missingExpectedNames: [],
    ready: true,
  };
}

describe("Cloudflare provider resource readback checker", () => {
  it("skips all provider readback commands until Wrangler auth is proven", () => {
    const report = buildCloudflareProviderResourceReadbackReport({
      wranglerConfigText: WRANGLER_CONFIG,
      workerReadiness: WORKER_READINESS,
      generatedAt: "2026-06-30T00:00:00.000Z",
    });

    expect(report.readiness.wranglerAuthenticated).toBe(false);
    expect(report.readiness.providerReadbackAttempted).toBe(false);
    expect(report.readiness.providerResourceReadbackReady).toBe(false);
    expect(report.commands.every((command) => command.skipped)).toBe(true);
    expect(report.blockers[0]).toContain("Wrangler/API authentication is not proven");
  });

  it("passes when authenticated read-only command results contain all expected provider names", () => {
    const report = buildCloudflareProviderResourceReadbackReport({
      wranglerConfigText: WRANGLER_CONFIG,
      wranglerAuth: AUTHENTICATED,
      workerReadiness: WORKER_READINESS,
      generatedAt: "2026-06-30T00:00:00.000Z",
      commandRunner: (spec) => ({
        ...commandFixture(spec.expectedNames, {
          minRecordCount: spec.minRecordCount,
          parsedRecordCount: Math.max(spec.expectedNames.length, spec.minRecordCount ?? 0),
        }),
        key: spec.key,
        label: spec.label,
        args: spec.args,
        expectedNames: spec.expectedNames,
        minRecordCount: spec.minRecordCount ?? null,
      }),
    });

    expect(report.expected).toMatchObject({
      workerName: "archestimator-proof",
      d1Databases: ["archestimator-proof-db"],
      r2Buckets: ["archestimator-proof-uploads", "archestimator-proof-uploads-dev"],
      queues: ["archestimator-upload-jobs", "archestimator-upload-jobs-dlq"],
      workerSecretNames: ["CRON_SECRET", "PUBLICATION_TOKEN_HASH_SECRET"],
    });
    expect(report.readiness.providerReadbackAttempted).toBe(true);
    expect(report.readiness.providerResourceReadbackReady).toBe(true);
    expect(report.readiness.productionCutoverReady).toBe(false);
  });

  it("keeps resource readback blocked when a read-only command misses an expected name", () => {
    const report = buildCloudflareProviderResourceReadbackReport({
      wranglerConfigText: WRANGLER_CONFIG,
      wranglerAuth: AUTHENTICATED,
      workerReadiness: WORKER_READINESS,
      generatedAt: "2026-06-30T00:00:00.000Z",
      commandRunner: (spec) => ({
        ...commandFixture([], {
          minRecordCount: spec.minRecordCount,
          parsedRecordCount: 0,
        }),
        key: spec.key,
        label: spec.label,
        args: spec.args,
        expectedNames: spec.expectedNames,
        minRecordCount: spec.minRecordCount ?? null,
        foundExpectedNames: [],
        missingExpectedNames: spec.expectedNames,
        ready: false,
      }),
    });

    expect(report.readiness.providerResourceReadbackReady).toBe(false);
    expect(report.blockers).toEqual(expect.arrayContaining([
      expect.stringContaining("missing expected names"),
    ]));
  });

  it("writes markdown without raw secret-looking command output", () => {
    const report = buildCloudflareProviderResourceReadbackReport({
      wranglerConfigText: WRANGLER_CONFIG,
      wranglerAuth: AUTHENTICATED,
      workerReadiness: WORKER_READINESS,
      generatedAt: "2026-06-30T00:00:00.000Z",
      commandRunner: (spec) => ({
        ...commandFixture(spec.expectedNames, {
          minRecordCount: spec.minRecordCount,
          parsedRecordCount: Math.max(spec.expectedNames.length, spec.minRecordCount ?? 0),
        }),
        key: spec.key,
        label: spec.label,
        args: spec.args,
        expectedNames: spec.expectedNames,
        minRecordCount: spec.minRecordCount ?? null,
      }),
    });
    const dir = mkdtempSync(join(tmpdir(), "cloudflare-provider-resources-"));
    try {
      const file = join(dir, "provider-resources.md");
      writeMarkdown(report, file);
      const markdown = readFileSync(file, "utf8");
      expect(markdown).toContain("Cloudflare Provider Resource Readback");
      expect(markdown).toContain("CRON_SECRET");
      expect(markdown).not.toContain("super-secret-value");
      expect(markdown).not.toContain("Authorization: Bearer");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
