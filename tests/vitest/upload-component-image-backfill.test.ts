import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { buildProjectPublicationSnapshot } from "@/lib/publication/snapshot";
import {
  classifyUploadImageReference,
  collectPublicationSnapshotImageReferences,
  summarizeUploadComponentImageBackfillReadiness,
  type UploadImageReferenceRecord,
} from "@/lib/uploads/component-image-backfill";

const UPLOAD_PLAN_DIR = ".ai/03_plans/000-Follow Ups/2026-06-26-File-Upload-Audit-And-Improvement";

describe("component image backfill readiness", () => {
  it("classifies asset-backed and brokered private references as ready", () => {
    const records: UploadImageReferenceRecord[] = [
      {
        id: "asset-backed-row",
        context: "estimate-row-source-snapshot",
        imageUrl: "/api/projects/images?path=workspace-1/user-1/project-images/project-1/estimate-row-images/estimate-1/row.webp",
        imageAsset: {
          assetId: "asset-1",
          bucket: "project-images",
          path: "workspace-1/user-1/project-images/project-1/estimate-row-images/estimate-1/row.webp",
          url: "/api/projects/images?path=workspace-1/user-1/project-images/project-1/estimate-row-images/estimate-1/row.webp",
        },
      },
      {
        id: "brokered-component",
        context: "component-library",
        imageUrl: "/api/component-library/images?path=workspace-1/user-1/component.webp",
      },
      {
        id: "local-derivative",
        context: "publication-snapshot",
        imageUrl: "/component-thumbnails/cabinet.webp",
      },
    ];

    expect(records.map(classifyUploadImageReference)).toEqual([
      {
        id: "asset-backed-row",
        context: "estimate-row-source-snapshot",
        status: "asset_backed",
        action: "none",
      },
      {
        id: "brokered-component",
        context: "component-library",
        status: "brokered_private",
        action: "none",
      },
      {
        id: "local-derivative",
        context: "publication-snapshot",
        status: "local_derivative",
        action: "none",
      },
    ]);
  });

  it("marks Supabase public component image URLs for private resolver backfill", () => {
    expect(classifyUploadImageReference({
      id: "legacy-public",
      context: "publication-snapshot",
      imageUrl: "https://example.supabase.co/storage/v1/object/public/component-images/workspace-1/user-1/component.webp",
    })).toEqual({
      id: "legacy-public",
      context: "publication-snapshot",
      status: "legacy_public_component_image",
      action: "backfill_to_private_resolver",
      storagePath: "workspace-1/user-1/component.webp",
    });
  });

  it("sends unsafe, unsupported, and external references to manual review", () => {
    expect([
      classifyUploadImageReference({
        id: "query-public",
        context: "component-library",
        imageUrl: "https://example.supabase.co/storage/v1/object/public/component-images/workspace-1/user-1/component.webp?token=1",
      }),
      classifyUploadImageReference({
        id: "unsupported-route",
        context: "estimate-row-source-snapshot",
        imageUrl: "/storage/v1/object/public/component-images/workspace-1/user-1/component.webp",
      }),
      classifyUploadImageReference({
        id: "external",
        context: "publication-snapshot",
        imageUrl: "https://cdn.example.com/component.webp",
      }),
    ]).toEqual([
      {
        id: "query-public",
        context: "component-library",
        status: "external_or_unsafe",
        action: "manual_review",
        reason: "unsafe_url",
      },
      {
        id: "unsupported-route",
        context: "estimate-row-source-snapshot",
        status: "external_or_unsafe",
        action: "manual_review",
        reason: "unsupported_internal_route",
      },
      {
        id: "external",
        context: "publication-snapshot",
        status: "external_or_unsafe",
        action: "manual_review",
        reason: "external_url",
      },
    ]);
  });

  it("summarizes privacy backfill readiness without claiming provider proof", () => {
    const classifications = [
      classifyUploadImageReference({
        id: "asset-backed",
        context: "estimate-row-source-snapshot",
        imageAsset: { assetId: "asset-1", bucket: "project-images", path: "workspace-1/path.webp", url: "/api/projects/images?path=workspace-1/path.webp" },
      }),
      classifyUploadImageReference({
        id: "legacy",
        context: "component-library",
        imageUrl: "https://example.supabase.co/storage/v1/object/public/component-images/workspace-1/user-1/component.webp",
      }),
      classifyUploadImageReference({
        id: "manual",
        context: "publication-snapshot",
        imageUrl: "https://cdn.example.com/component.webp",
      }),
      classifyUploadImageReference({
        id: "missing",
        context: "component-library",
        imageUrl: null,
      }),
    ];

    expect(summarizeUploadComponentImageBackfillReadiness(classifications)).toEqual({
      total: 4,
      ready: 1,
      needsBackfill: 1,
      manualReview: 1,
      missing: 1,
      hasLegacyPublicReferences: true,
      hasManualReviewReferences: true,
    });
  });

  it("exercises non-empty publication snapshot component-image migration classification", () => {
    const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";

    try {
      const legacyPublicUrl = "https://example.supabase.co/storage/v1/object/public/component-images/workspace-1/user-1/component-legacy.webp";
      const snapshot = buildProjectPublicationSnapshot({
        generatedAt: "2026-06-27T01:50:00.000Z",
        project: {
          id: "project-1",
          name: "Publication Image Proof",
          projectCode: "PIP-001",
          clientName: "Client Family",
          location: "Quezon City",
          currencyCode: "PHP",
        },
        estimates: [
          {
            id: "estimate-1",
            name: "Main Estimate",
            sheetCode: "ES-001",
            updatedAt: "2026-06-27T01:50:00.000Z",
            rows: [
              {
                id: "legacy-public-component",
                description: "Legacy public component image row",
                designation: "PUB-01",
                discipline: "Joinery",
                material: "Cabinet",
                quantity: 1,
                unit: "pc",
                unitCost: 1,
                miscCost: 0,
                contingencyPercentage: 0,
                imageUrl: legacyPublicUrl,
              },
              {
                id: "local-thumbnail",
                description: "Local publication thumbnail row",
                designation: "PUB-02",
                discipline: "Joinery",
                material: "Handle",
                quantity: 1,
                unit: "pc",
                unitCost: 1,
                miscCost: 0,
                contingencyPercentage: 0,
                imageUrl: "/component-thumbnails/cabinet.webp",
              },
            ],
          },
        ],
      });

      const references = collectPublicationSnapshotImageReferences(snapshot);
      const classifications = references.map(classifyUploadImageReference);

      expect(snapshot.estimates[0]?.rows.map((row) => row.imageUrl)).toEqual([
        undefined,
        "/component-thumbnails/cabinet.webp",
      ]);
      expect(classifications).toEqual([
        {
          id: "publication:estimate-1:row:legacy-public-component",
          context: "publication-snapshot",
          status: "missing",
          action: "none",
        },
        {
          id: "publication:estimate-1:row:local-thumbnail",
          context: "publication-snapshot",
          status: "local_derivative",
          action: "none",
        },
      ]);
      expect(summarizeUploadComponentImageBackfillReadiness(classifications)).toEqual({
        total: 2,
        ready: 1,
        needsBackfill: 0,
        manualReview: 0,
        missing: 1,
        hasLegacyPublicReferences: false,
        hasManualReviewReferences: false,
      });
    } finally {
      if (originalSupabaseUrl === undefined) {
        delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      } else {
        process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl;
      }
    }
  });

  it("records the non-empty publication snapshot migration proof artifact", () => {
    const evidence = JSON.parse(readFileSync(join(
      process.cwd(),
      `${UPLOAD_PLAN_DIR}/evidence/upload-component-image-publication-snapshot-migration-proof.json`,
    ), "utf8"));

    expect(evidence).toEqual(expect.objectContaining({
      proofBoundary: "local-non-empty-publication-snapshot-fixture",
      passed: true,
      providerProjectRef: "ebxxqidacheyapmmzavr",
    }));
    expect(evidence.snapshot).toEqual({
      schemaVersion: 1,
      estimateCount: 1,
      rowCount: 2,
      nonEmptyImageRows: 2,
    });
    expect(evidence.classifications).toEqual([
      {
        id: "publication:estimate-1:row:legacy-public-component",
        context: "publication-snapshot",
        status: "legacy_public_component_image",
        action: "backfill_to_private_resolver",
        storagePath: "workspace-1/user-1/component-legacy.webp",
      },
      {
        id: "publication:estimate-1:row:local-thumbnail",
        context: "publication-snapshot",
        status: "local_derivative",
        action: "none",
      },
    ]);
    expect(evidence.summary).toEqual({
      total: 2,
      ready: 1,
      needsBackfill: 1,
      manualReview: 0,
      missing: 0,
      hasLegacyPublicReferences: true,
      hasManualReviewReferences: false,
    });
  });
});
