import { expect, it } from "vitest";

import { optionalUploadProviderProof } from "./upload-provider-proof-fixture";

type StorageDenialCheck = {
  label: string;
  denied: boolean;
  proof?: string;
};

type StorageDenialProof = {
  proofBoundary: string;
  passed: boolean;
  skipped: boolean;
  projectRef: string;
  expectedProjectRef: string;
  authStrategy: string;
  temporaryUserDeleted: boolean;
  checkedBuckets: string[];
  checks: StorageDenialCheck[];
  failedChecks: string[];
  cleanupErrors: unknown[];
  envFile?: {
    names?: string[];
  };
};

const { describeProof, proof } = optionalUploadProviderProof<StorageDenialProof>("upload-storage-denial-proof.json");

describeProof("upload storage denial provider proof evidence", () => {
  it("records a passed linked-provider direct storage denial proof without credential material", () => {
    expect(proof.proofBoundary).toBe("linked-provider");
    expect(proof.passed).toBe(true);
    expect(proof.skipped).toBe(false);
    expect(proof.projectRef).toBe("ebxxqidacheyapmmzavr");
    expect(proof.expectedProjectRef).toBe("ebxxqidacheyapmmzavr");
    expect(proof.authStrategy).toBe("temporary-user");
    expect(proof.temporaryUserDeleted).toBe(true);
    expect(proof.checkedBuckets).toEqual(["project-images", "component-images", "component-attachments"]);
    expect(proof.failedChecks).toEqual([]);
    expect(proof.cleanupErrors).toEqual([]);
    expect(proof.envFile?.names).toEqual([
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
    ]);

    const serialized = JSON.stringify(proof).toLowerCase();
    expect(serialized).not.toContain("access_token");
    expect(serialized).not.toContain("refresh_token");
    expect(serialized).not.toContain("password");
    expect(serialized).not.toContain("example.com");
    expect(serialized).not.toContain("proof-");
  });

  it("covers anon and authenticated direct insert, update, download, and delete denial for each upload bucket", () => {
    const expectedLabels = new Set<string>();
    for (const bucket of proof.checkedBuckets) {
      for (const operation of [
        "anon-direct-insert",
        "authenticated-direct-insert",
        "wrong-prefix-direct-insert",
        "anon-direct-update",
        "authenticated-direct-update",
        "anon-direct-download",
        "authenticated-direct-download",
        "anon-direct-delete",
        "authenticated-direct-delete",
      ]) {
        expectedLabels.add(`${bucket}:${operation}`);
      }
    }

    const checksByLabel = new Map(proof.checks.map((check) => [check.label, check]));
    for (const label of expectedLabels) {
      expect(checksByLabel.get(label), label).toEqual(expect.objectContaining({ denied: true }));
    }

    for (const label of [...expectedLabels].filter((item) => item.endsWith("direct-delete"))) {
      expect(checksByLabel.get(label), label).toEqual(expect.objectContaining({
        proof: "object-still-present-after-direct-delete-attempt",
      }));
    }
  });
});
