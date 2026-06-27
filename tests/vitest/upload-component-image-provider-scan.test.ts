import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const providerScan = JSON.parse(readFileSync(join(
  process.cwd(),
  ".ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-component-image-provider-scan.json",
), "utf8")) as {
  proofBoundary: string;
  projectId: string;
  passed: boolean;
  scopes: Array<{ scope: string; counts: Record<string, number> }>;
  summary: {
    legacyPublicComponentImageUrls: number;
    persistedRowsNeedingComponentImageBackfill: number;
    nonProviderEstimateRowImageReferences: number;
    unsafeReferenceMarkers: number;
  };
  limitations: string[];
};

describe("upload component image provider scan evidence", () => {
  it("records aggregate provider scan counts without persisted legacy public component-image URLs", () => {
    expect(providerScan.projectId).toBe("ebxxqidacheyapmmzavr");
    expect(providerScan.proofBoundary).toBe("linked-provider-aggregate-readback");
    expect(providerScan.passed).toBe(true);
    expect(providerScan.summary).toMatchObject({
      legacyPublicComponentImageUrls: 0,
      persistedRowsNeedingComponentImageBackfill: 0,
      unsafeReferenceMarkers: 0,
      nonProviderEstimateRowImageReferences: 3,
    });
    expect(providerScan.scopes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        scope: "estimate_row_items",
        counts: expect.objectContaining({
          total: 3,
          imageRefs: 3,
          legacyPublicUrls: 0,
          assetDescriptors: 0,
        }),
      }),
      expect.objectContaining({
        scope: "project_publications",
        counts: expect.objectContaining({ total: 0, legacyPublicUrls: 0 }),
      }),
      expect.objectContaining({
        scope: "upload_assets",
        counts: expect.objectContaining({ totalUploadAssets: 0, componentImageAssets: 0 }),
      }),
    ]));
  });

  it("keeps provider read-denial and bucket privacy outside the aggregate scan claim", () => {
    expect(providerScan.limitations.join(" ")).toContain("not direct provider read-denial proof");
    expect(providerScan.limitations.join(" ")).toContain("did not by itself prove linked storage bucket privacy state");
    expect(providerScan.limitations.join(" ")).toContain("upload-component-image-private-bucket-readback.json");
  });
});
