import { expect, it } from "vitest";

import { optionalUploadProviderProof } from "./upload-provider-proof-fixture";

const { describeProof, proof } = optionalUploadProviderProof<{
  proofBoundary: string;
  passed: boolean;
  skipped: boolean;
  projectRef: string;
  actorCap: {
    attempts: number;
    admittedCount: number;
    actorCapacityErrorCount: number;
    workspaceCapacityErrorCount: number;
    otherErrorCount: number;
    readbackReservedCount: number;
    expectedAdmittedCount: number;
    expectedCapacityQuotaClass: string;
  };
  workspaceCap: {
    attempts: number;
    admittedCount: number;
    actorCapacityErrorCount: number;
    workspaceCapacityErrorCount: number;
    otherErrorCount: number;
    readbackReservedCount: number;
    expectedAdmittedCount: number;
    expectedCapacityQuotaClass: string;
  };
  checks: Array<{ label: string; passed: boolean }>;
  failedChecks: string[];
  cleanupErrors: unknown[];
}>("upload-session-capacity-provider-proof.json");

describeProof("upload session capacity provider proof evidence", () => {
  it("records passed linked-provider create_upload_session concurrency proof", () => {
    expect(proof.proofBoundary).toBe("linked-provider-create-upload-session-concurrency-proof");
    expect(proof.passed).toBe(true);
    expect(proof.skipped).toBe(false);
    expect(proof.projectRef).toBe("ebxxqidacheyapmmzavr");
    expect(proof.failedChecks).toEqual([]);
    expect(proof.cleanupErrors).toEqual([]);
    expect(proof.checks.every((check) => check.passed)).toBe(true);
  });

  it("proves actor and workspace capacity limits under parallel RPC calls", () => {
    expect(proof.actorCap).toMatchObject({
      attempts: 8,
      admittedCount: 3,
      actorCapacityErrorCount: 5,
      workspaceCapacityErrorCount: 0,
      otherErrorCount: 0,
      readbackReservedCount: 3,
      expectedAdmittedCount: 3,
      expectedCapacityQuotaClass: "active_actor",
    });
    expect(proof.workspaceCap).toMatchObject({
      attempts: 8,
      admittedCount: 6,
      actorCapacityErrorCount: 0,
      workspaceCapacityErrorCount: 2,
      otherErrorCount: 0,
      readbackReservedCount: 6,
      expectedAdmittedCount: 6,
      expectedCapacityQuotaClass: "active_workspace",
    });
    expect(proof.checks.map((check) => check.label)).toEqual([
      "parallel-create-upload-session-actor-cap-admits-three",
      "parallel-create-upload-session-actor-cap-rejects-overflow",
      "parallel-create-upload-session-workspace-cap-admits-six",
      "parallel-create-upload-session-workspace-cap-rejects-overflow",
    ]);
  });

  it("does not record raw fixture ids, storage paths, or tokens", () => {
    const serialized = JSON.stringify(proof);
    expect(serialized).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    expect(serialized).not.toContain("capacity-actor-cap");
    expect(serialized).not.toContain("capacity-workspace-cap");
    expect(serialized).not.toContain("Bearer ");
    expect(serialized).not.toContain("token=");
    expect(serialized).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });
});
