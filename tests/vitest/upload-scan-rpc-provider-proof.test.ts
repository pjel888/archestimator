import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const proof = JSON.parse(readFileSync(join(
  process.cwd(),
  ".ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-scan-rpc-provider-proof.json",
), "utf8")) as {
  proofBoundary: string;
  passed: boolean;
  skipped: boolean;
  projectRef: string;
  assetFixtureCount: number;
  assetShapes: Array<{ label: string; surface: string; pathShape: string }>;
  assetStatusByLabel: Record<string, {
    scanStatus: string | null;
    scanProvider: string | null;
    scanned: boolean;
    overrideAudited: boolean;
  }>;
  eventTypeCounts: Record<string, number>;
  deniedChecks: string[];
  checks: Array<{ label: string; passed: boolean }>;
  failedChecks: string[];
  cleanupErrors: unknown[];
};

describe("upload scan RPC provider proof evidence", () => {
  it("records a passed linked-provider scanner RPC state/readback proof", () => {
    expect(proof.proofBoundary).toBe("linked-provider-scan-rpc-readback");
    expect(proof.passed).toBe(true);
    expect(proof.skipped).toBe(false);
    expect(proof.projectRef).toBe("ebxxqidacheyapmmzavr");
    expect(proof.assetFixtureCount).toBe(7);
    expect(proof.failedChecks).toEqual([]);
    expect(proof.cleanupErrors).toEqual([]);
    expect(proof.checks.every((check) => check.passed)).toBe(true);
  });

  it("verifies terminal scan statuses, override audit, and denied mutation cases", () => {
    expect(proof.assetStatusByLabel.clean).toMatchObject({
      scanStatus: "clean",
      scanProvider: "proof-scanner",
      scanned: true,
      overrideAudited: false,
    });
    expect(proof.assetStatusByLabel["failed-transient"]).toMatchObject({
      scanStatus: "failed_transient",
      scanProvider: "proof-scanner",
      scanned: true,
      overrideAudited: false,
    });
    expect(proof.assetStatusByLabel.infected).toMatchObject({
      scanStatus: "infected",
      scanProvider: "proof-scanner",
      scanned: true,
      overrideAudited: false,
    });
    expect(proof.assetStatusByLabel["failed-permanent"]).toMatchObject({
      scanStatus: "override_approved",
      scanProvider: "proof-scanner",
      scanned: true,
      overrideAudited: true,
    });
    expect(proof.assetStatusByLabel.unsupported).toMatchObject({
      scanStatus: "override_approved",
      scanProvider: "proof-scanner",
      scanned: true,
      overrideAudited: true,
    });
    expect(proof.assetStatusByLabel["checksum-mismatch"]).toMatchObject({
      scanStatus: "pending",
      scanProvider: null,
      scanned: false,
      overrideAudited: false,
    });
    expect(proof.assetStatusByLabel["non-attachment"]).toMatchObject({
      scanStatus: "not_required",
      scanProvider: null,
      scanned: false,
      overrideAudited: false,
    });

    expect(proof.deniedChecks).toEqual([
      "record-scan-result-rejects-checksum-mismatch",
      "record-scan-result-rejects-non-attachment",
      "scan-override-rejects-checksum-mismatch",
    ]);
  });

  it("records scanner events and redacts provider-specific proof identifiers", () => {
    expect(proof.eventTypeCounts).toEqual(expect.objectContaining({
      scan_clean: 1,
      scan_failed_transient: 1,
      scan_infected: 1,
      scan_failed_permanent: 1,
      scan_unsupported: 1,
      scan_override_approved: 2,
    }));
    expect(proof.assetShapes.every((asset) => asset.pathShape.includes("{proofId}"))).toBe(true);
    expect(proof.assetShapes.map((asset) => asset.label)).toEqual([
      "clean",
      "failed-transient",
      "infected",
      "failed-permanent",
      "unsupported",
      "checksum-mismatch",
      "non-attachment",
    ]);

    const serialized = JSON.stringify(proof);
    expect(serialized).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    expect(serialized).not.toContain("access_token");
    expect(serialized).not.toContain("refresh_token");
    expect(serialized).not.toContain("Bearer ");
    expect(serialized).not.toContain("password");
  });
});
