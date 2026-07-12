import { describe, expect, it } from "vitest";

import { buildD1RecoveryOverviewSource } from "@/lib/admin/recovery-overview";
import type { D1RecoveryReceipt } from "../../scripts/check-cloudflare-d1-recovery-readiness";

const now = new Date("2026-07-12T00:00:00.000Z");
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

describe("D1 recovery overview source", () => {
  it("exposes ready only for a current provider-backed receipt", () => {
    const source = buildD1RecoveryOverviewSource(receipt(), now);

    expect(source).toMatchObject({
      availability: "available",
      asOf: "2026-07-11T23:30:00.000Z",
      errorCategory: null,
      fields: { ready: { availability: "available", value: true } },
    });
  });

  it("keeps a missing receipt unavailable", () => {
    const source = buildD1RecoveryOverviewSource(undefined, now);

    expect(source).toMatchObject({
      availability: "unavailable",
      errorCategory: "source_unavailable",
      fields: { ready: { availability: "unavailable", value: undefined } },
    });
  });

  it.each([
    ["local-only", { localOnly: true, providerBacked: false }],
    ["expired", { expiresAt: "2026-07-11T23:59:00.000Z" }],
    ["invalid", { checks: { ...receipt().checks, corporateIntegrity: false } }],
  ])("never exposes ready for %s receipts", (_name, override) => {
    const source = buildD1RecoveryOverviewSource({ ...receipt(), ...override }, now);

    expect(source).toMatchObject({
      availability: "error",
      errorCategory: "source_failed",
      fields: { ready: { availability: "error", value: undefined } },
    });
  });
});
