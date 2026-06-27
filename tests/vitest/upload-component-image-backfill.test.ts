import { describe, expect, it } from "vitest";

import {
  classifyUploadImageReference,
  summarizeUploadComponentImageBackfillReadiness,
  type UploadImageReferenceRecord,
} from "@/lib/uploads/component-image-backfill";

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
});
