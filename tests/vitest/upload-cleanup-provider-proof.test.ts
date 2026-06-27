import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const proof = JSON.parse(readFileSync(join(
  process.cwd(),
  ".ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-cleanup-provider-proof.json",
), "utf8")) as {
  proofBoundary: string;
  passed: boolean;
  skipped: boolean;
  projectRef: string;
  checkedBuckets: string[];
  planner: {
    recordCount: number;
    candidateCount: number;
    rejectedCount: number;
    candidateLabels: string[];
    rejectedLabels: string[];
    rejectedReasons: Record<string, number>;
  };
  targetShapes: Array<{
    label: string;
    pathShape: string;
    expectedDisposition: string;
    seeded: boolean;
  }>;
  seededCount: number;
  removedCount: number;
  failedCount: number;
  rejectedCount: number;
  failedBuckets: string[];
  readbackMissingCount: number;
  preservedReadbackCount: number;
  failedChecks: string[];
  cleanupErrors: unknown[];
  operationalSnapshot: {
    status: string;
    dashboardMetrics: {
      cleanupCandidates: number;
      cleanupRemoved: number;
      cleanupFailed: number;
      cleanupRejected: number;
      failedBucketCount: number;
    };
  };
};

describe("upload cleanup provider proof evidence", () => {
  it("records a passed linked-provider cleanup proof through planner-approved targets", () => {
    expect(proof.proofBoundary).toBe("linked-provider-cleanup-execution-readback");
    expect(proof.passed).toBe(true);
    expect(proof.skipped).toBe(false);
    expect(proof.projectRef).toBe("ebxxqidacheyapmmzavr");
    expect(proof.checkedBuckets).toEqual(["project-images", "component-images", "component-attachments"]);
    expect(proof.planner.recordCount).toBe(10);
    expect(proof.planner.candidateCount).toBe(5);
    expect(proof.planner.rejectedCount).toBe(5);
    expect(proof.planner.candidateLabels).toEqual([
      "component-images:failed-main",
      "component-images:failed-thumbnail",
      "project-images:expired",
      "project-images:reserved-expired",
      "component-attachments:deleted-pdf",
    ]);
    expect(proof.planner.rejectedLabels).toEqual(expect.arrayContaining([
      "component-images:finalized-preserved",
      "project-images:active-preserved",
      "component-attachments:cross-workspace-preserved",
      "component-attachments:wrong-extension-preserved",
      "component-images:traversal-rejected-unseeded",
    ]));
    expect(proof.planner.rejectedReasons).toEqual({
      not_cleanup_eligible: 2,
      unsafe_path: 3,
    });
  });

  it("verifies provider deletion readback and preserved rejected objects without leaking proof paths", () => {
    expect(proof.seededCount).toBe(9);
    expect(proof.removedCount).toBe(5);
    expect(proof.failedCount).toBe(0);
    expect(proof.rejectedCount).toBe(5);
    expect(proof.failedBuckets).toEqual([]);
    expect(proof.readbackMissingCount).toBe(5);
    expect(proof.preservedReadbackCount).toBe(4);
    expect(proof.failedChecks).toEqual([]);
    expect(proof.cleanupErrors).toEqual([]);
    expect(proof.operationalSnapshot.dashboardMetrics).toEqual({
      cleanupCandidates: 5,
      cleanupRemoved: 5,
      cleanupFailed: 0,
      cleanupRejected: 5,
      failedBucketCount: 0,
    });
    expect(proof.operationalSnapshot.status).toBe("attention");

    expect(proof.targetShapes.every((target) => target.pathShape.includes("{proofId}"))).toBe(true);
    expect(proof.targetShapes.map((target) => target.expectedDisposition)).toEqual(expect.arrayContaining([
      "deleted",
      "preserved",
      "rejected-unseeded",
    ]));

    const serialized = JSON.stringify(proof);
    expect(serialized).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    expect(serialized).not.toContain("access_token");
    expect(serialized).not.toContain("refresh_token");
    expect(serialized).not.toContain("Bearer ");
    expect(serialized).not.toContain("password");
  });
});
