import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const privateBucketReadback = JSON.parse(readFileSync(join(
  process.cwd(),
  ".ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-component-image-private-bucket-readback.json",
), "utf8")) as {
  proofBoundary: string;
  projectId: string;
  migration: {
    providerVersion: string;
    providerName: string;
    localPath: string;
  };
  before: {
    bucket: { id: string; public: boolean };
    publicReadPolicy: { present: boolean; policyname: string };
  };
  after: {
    bucket: { id: string; public: boolean };
    namedPublicReadPolicies: unknown[];
    componentImageStoragePolicies: unknown[];
  };
  passed: boolean;
  limitations: string[];
};

describe("upload component image private bucket provider readback", () => {
  it("records the linked provider bucket privacy flip and public policy removal", () => {
    expect(privateBucketReadback.projectId).toBe("ebxxqidacheyapmmzavr");
    expect(privateBucketReadback.proofBoundary).toBe("linked-provider-storage-catalog-readback");
    expect(privateBucketReadback.passed).toBe(true);
    expect(privateBucketReadback.migration).toMatchObject({
      providerVersion: "20260627010904",
      providerName: "20260627120000_make_component_images_private",
      localPath: "supabase/migrations/20260627010904_20260627120000_make_component_images_private.sql",
    });
    expect(privateBucketReadback.before.bucket).toEqual({ id: "component-images", public: true });
    expect(privateBucketReadback.before.publicReadPolicy).toMatchObject({
      present: true,
      policyname: "component images are publicly readable",
    });
    expect(privateBucketReadback.after.bucket).toEqual({ id: "component-images", public: false });
    expect(privateBucketReadback.after.namedPublicReadPolicies).toEqual([]);
    expect(privateBucketReadback.after.componentImageStoragePolicies).toEqual([]);
  });

  it("does not overclaim direct object read-denial or non-empty publication migration proof", () => {
    const limitations = privateBucketReadback.limitations.join(" ");

    expect(limitations).toContain("not a direct unauthenticated object download/read-denial operation proof");
    expect(limitations).toContain("not exercised against non-empty publication data");
    expect(limitations).toContain("local route tests");
  });
});
