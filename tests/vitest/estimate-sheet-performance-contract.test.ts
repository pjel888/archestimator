import { describe, expect, it } from "vitest";

import {
  PERFORMANCE_REPORT_SCHEMA,
  FIXTURE_PROFILES,
  canonicalJson,
  sha256Hex,
  validatePerformanceReport,
} from "../../scripts/lib/estimate-sheet-performance-contract";
import { createTestReceipt } from "../../scripts/lib/estimate-sheet-performance-test-receipt";

const digest = sha256Hex("estimate-sheet-contract-fixture");
const fingerprint = {
  contract_version: "estimate-sheet-application-fingerprint.v1",
  path_count: 1,
  path_list_sha256: digest,
  content_sha256: digest,
};

function validReport(overrides: Record<string, unknown> = {}) {
  return {
    schema_version: PERFORMANCE_REPORT_SCHEMA,
    evidenceClass: "jsdom",
    trace: { packageId: "PLAN-2026-07-08-project-estimate-sheet-performance", unitId: "UNIT-001" },
    head: "abcdef1234567",
    applicationFingerprint: fingerprint,
    producerFingerprint: fingerprint,
    fixtureHash: digest,
    buildHash: null,
    runId: "run-contract-001",
    generatedAt: "2026-07-11T00:00:00.000Z",
    method: { warmups: 3, samples: 30, workerCount: 1, retries: 0, profile: "limit" },
    metrics: {
      editP95Ms: { status: "PASS", value: 1 },
      mountedRows: { status: "PASS", value: 20 },
    },
    overall: "PASS",
    ...overrides,
  };
}

describe("estimate-sheet performance report contract", () => {
  it("accepts the canonical jsdom report shape", async () => {
    const contract = await import("../../scripts/lib/estimate-sheet-performance-contract");
    expect(contract.validatePerformanceReport(validReport())).toEqual([]);
  });

  it("keeps the closed fixture profile row counts in sync with the generator", () => {
    expect(FIXTURE_PROFILES).toEqual({
      small: 50,
      medium: 500,
      large: 1_000,
      stress: 2_500,
      limit: 5_000,
      "over-limit": 5_001,
      "realistic-skew": 5_000,
    });
  });

  it("rejects a browser report that omits its build identity", async () => {
    const contract = await import("../../scripts/lib/estimate-sheet-performance-contract");
    const errors = contract.validatePerformanceReport({ ...validReport(), evidenceClass: "local-browser" });
    expect(errors).toContain("local-browser requires buildHash");
    expect(errors).toContain("local-browser browserScope invalid");
  });

  it("rejects unsupported metric values and incomplete skipped metrics", async () => {
    const contract = await import("../../scripts/lib/estimate-sheet-performance-contract");
    const errors = contract.validatePerformanceReport({
      ...validReport(),
      metrics: {
        infinite: { status: "PASS", value: Number.POSITIVE_INFINITY },
        skipped: { status: "SKIPPED" },
      },
    });
    expect(errors).toContain("metrics.infinite.value non-finite");
    expect(errors).toContain("metrics.skipped skipped metric requires reason and residualRisk");
  });

  it("rejects unknown fields in strict mode while allowing declared extension fields", async () => {
    const contract = await import("../../scripts/lib/estimate-sheet-performance-contract");
    expect(contract.validatePerformanceReport({ ...validReport(), rawSamples: [] }, { strict: true })).toEqual([]);
    expect(contract.validatePerformanceReport({ ...validReport(), madeUp: true }, { strict: true })).toContain(
      "unknown report field: madeUp",
    );
  });

  it("canonicalizes object keys without changing array order", () => {
    expect(canonicalJson({ b: 2, a: { z: 3, y: 4 }, list: [{ d: 1, c: 2 }] })).toBe(
      '{"a":{"y":4,"z":3},"b":2,"list":[{"c":2,"d":1}]}',
    );
  });

  it("creates a receipt with equal pre/post fingerprints and redacted failure identifiers", async () => {
    const receipt = createTestReceipt({
      testClass: "vitest",
      argv: ["bun", "run", "test:dom"],
      files: ["tests/vitest/estimate-sheet-performance-contract.test.ts"],
      unitId: "UNIT-001",
      runId: "run-contract-001",
      applicationFingerprint: fingerprint,
      producerFingerprint: fingerprint,
      passed: 3,
      failed: 1,
      skipped: 0,
      durationMs: 4,
      failureIds: ["route failed token=super-secret", "route failed token=super-secret"],
    });
    expect(receipt.schema_version).toBe("estimate-sheet-test-receipt.v1");
    expect(receipt.workers).toBe(1);
    expect(receipt.retries).toBe(0);
    expect(receipt.overall).toBe("FAIL");
    expect(receipt.failure_ids).toHaveLength(1);
    expect(receipt.failure_ids[0]).not.toContain("super-secret");
    expect(receipt.failure_ids[0]).toContain("<redacted>");
    const contract = await import("../../scripts/lib/estimate-sheet-performance-contract");
    expect(contract.validateTestReceipt(receipt)).toEqual([]);
  });

  it("rejects receipt construction that changes fingerprints or uses retries", () => {
    expect(() => createTestReceipt({
      testClass: "vitest",
      argv: ["bun"],
      files: ["tests/vitest/example.test.ts"],
      unitId: "UNIT-001",
      runId: "run-contract-002",
      applicationFingerprint: fingerprint,
      producerFingerprint: fingerprint,
      preProducerFingerprint: { ...fingerprint, content_sha256: sha256Hex("different") },
      retries: 1,
    })).toThrow(/fingerprint changed|zero retries/);
  });
});
