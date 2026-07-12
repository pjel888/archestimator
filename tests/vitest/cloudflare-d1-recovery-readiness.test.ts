import { describe, expect, it } from "vitest";

import {
  buildD1RecoveryReadinessReport,
  validateD1RecoveryReceipt,
  type D1RecoveryReceipt,
} from "../../scripts/check-cloudflare-d1-recovery-readiness";

const now = Date.parse("2026-07-12T00:00:00.000Z");
const hash = "a".repeat(64);

function receipt(): D1RecoveryReceipt {
  return {
    schema: "D1-RECOVERY-RECEIPT-v1",
    producerVersion: "1.0.0",
    runId: "recovery-20260712-a1b2c3d4",
    identity: { accountHash: hash, sourceHash: hash, targetHash: hash },
    exportDigest: "export-digest",
    revisions: { migration: "0069", application: "app-revision", authorization: "auth-revision", session: "session-revision", source: "source-revision" },
    milestones: { startedAt: "2026-07-11T23:00:00.000Z", completedAt: "2026-07-11T23:30:00.000Z" },
    rtoSeconds: 1800,
    rpoSeconds: 60,
    checks: { schema: true, application: true, authorization: true, session: true, corporateIntegrity: true, corporateOnlyDenied: true },
    sessionInvalidated: true,
    cleanup: { inventory: ["d1", "worker", "secrets"], absenceReadback: true, complete: true },
    operatorLabel: "operator-hash-prefix",
    failures: [],
    result: "pass",
    localOnly: false,
    providerBacked: true,
    issuedAt: "2026-07-11T23:30:00.000Z",
    expiresAt: "2026-07-12T01:30:00.000Z",
  };
}

describe("Cloudflare D1 recovery readiness receipt", () => {
  it("accepts only a complete current provider-backed receipt without claiming hosted success", () => {
    const report = buildD1RecoveryReadinessReport(receipt(), now);
    expect(report.recoveryReceiptValid).toBe(true);
    expect(report.providerBacked).toBe(false);
  });

  it.each([
    ["local-only", { localOnly: true, providerBacked: false }, "provider-evidence"],
    ["dirty cleanup", { cleanup: { inventory: ["d1"], absenceReadback: false, complete: false } }, "cleanup"],
    ["expired", { expiresAt: "2026-07-11T23:59:00.000Z" }, "freshness"],
    ["failed integrity", { checks: { ...receipt().checks, corporateIntegrity: false } }, "integrity-checks"],
    ["sparse integrity", { checks: {} }, "integrity-checks"],
    ["failed result", { failures: ["cleanup"], result: "fail" as const }, "result"],
    ["string cleanup inventory", { cleanup: { inventory: "d1" as unknown as string[], absenceReadback: true, complete: true } }, "cleanup"],
  ])("fails closed for %s data", (_name, override, failure) => {
    const validation = validateD1RecoveryReceipt({ ...receipt(), ...override }, now);
    expect(validation.valid).toBe(false);
    expect(validation.failures).toContain(failure);
  });
});
