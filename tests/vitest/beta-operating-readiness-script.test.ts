import { describe, expect, it } from "vitest";

import {
  BETA_OPERATING_INPUT_VERSION,
  buildBetaOperatingReadiness,
  validateBetaOperatingReadinessReport,
  type BetaOperatingReadinessInput,
} from "../../scripts/check-beta-operating-readiness";

const now = new Date("2026-07-12T00:00:00.000Z");
const sha = "a".repeat(40);
const artifactNames = ["telemetry", "operator", "incidentSupport", "auth", "legal", "activation", "recovery", "maintainability"] as const;

function input(): BetaOperatingReadinessInput {
  return {
    schemaVersion: BETA_OPERATING_INPUT_VERSION,
    releaseId: "release-20260712-a1b2c3d4",
    candidateSha: sha,
    environment: "production",
    artifacts: Object.fromEntries(artifactNames.map((name) => [name, {
      schemaVersion: `${name.toUpperCase()}-RECEIPT-v1`,
      producerVersion: `${name}-producer-v1`,
      releaseId: "release-20260712-a1b2c3d4",
      candidateSha: sha,
      environment: "production",
      collectedAt: "2026-07-11T23:00:00.000Z",
      expiresAt: "2026-07-13T00:00:00.000Z",
      status: "pass" as const,
      providerBacked: false as const,
    }])) as BetaOperatingReadinessInput["artifacts"],
  };
}

describe("beta operating readiness", () => {
  it("emits a local report while retaining all external boundaries", () => {
    const report = buildBetaOperatingReadiness({ ...input(), now });

    expect(report.localReady).toBe(true);
    expect(report.decision).toBe("NO_GO");
    expect(report.criteria.slice(0, 7).every((criterion) => criterion.status === "PASS")).toBe(true);
    expect(report.criteria.slice(7).map((criterion) => criterion.status)).toEqual(["BOUNDARY", "BOUNDARY", "BOUNDARY"]);
    expect(validateBetaOperatingReadinessReport(report, now)).toEqual(report);
  });

  it.each([
    ["stale", (value: BetaOperatingReadinessInput) => ({ ...value, artifacts: { ...value.artifacts, telemetry: { ...value.artifacts.telemetry, expiresAt: "2026-07-11T23:30:00.000Z" } } })],
    ["mismatched", (value: BetaOperatingReadinessInput) => ({ ...value, artifacts: { ...value.artifacts, recovery: { ...value.artifacts.recovery, candidateSha: "b".repeat(40) } } })],
    ["missing", (value: BetaOperatingReadinessInput) => ({ ...value, artifacts: { ...value.artifacts, legal: undefined } as BetaOperatingReadinessInput["artifacts"] })],
  ])("keeps %s local evidence at NO_GO", (_name, mutate) => {
    const report = buildBetaOperatingReadiness({ ...mutate(input()), now });

    expect(report.decision).toBe("NO_GO");
    expect(report.localReady).toBe(false);
  });

  it("rejects a stale emitted report", () => {
    const report = buildBetaOperatingReadiness({ ...input(), now });

    expect(() => validateBetaOperatingReadinessReport({ ...report, expiresAt: "2026-07-11T23:30:00.000Z" }, now)).toThrow("stale or expired");
  });
});
