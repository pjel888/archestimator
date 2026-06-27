import { describe, expect, it } from "vitest";

import {
  createBrokeredUploadImageUrl,
  normalizeUploadImageReferenceForProvider,
  summarizeUploadReferencePortability,
  type UploadAssetDescriptorV1,
} from "@/lib/uploads/asset-descriptor-migration";

const PROJECT_IMAGE_PATH =
  "workspace-1/user-1/project-images/project-1/estimate-row-images/estimate-1/reference.webp";
const PROJECT_IMAGE_THUMB_PATH =
  "workspace-1/user-1/project-images/project-1/estimate-row-images/estimate-1/reference-thumb.webp";
const COMPONENT_IMAGE_PATH = "workspace-1/user-1/component.webp";

function estimateRowDescriptor(overrides: Partial<UploadAssetDescriptorV1> = {}): UploadAssetDescriptorV1 {
  return {
    kind: "upload-asset",
    schemaVersion: 1,
    assetId: "asset-1",
    uploadSessionId: "session-1",
    bucket: "project-images",
    path: PROJECT_IMAGE_PATH,
    thumbnailPath: PROJECT_IMAGE_THUMB_PATH,
    url: createBrokeredUploadImageUrl({ bucket: "project-images", path: PROJECT_IMAGE_PATH }),
    thumbnailUrl: createBrokeredUploadImageUrl({ bucket: "project-images", path: PROJECT_IMAGE_THUMB_PATH }),
    fileName: "reference.png",
    contentType: "image/webp",
    sizeBytes: 128,
    scanStatus: "not_required",
    width: 640,
    height: 480,
    thumbnailWidth: 256,
    thumbnailHeight: 192,
    ...overrides,
  };
}

describe("upload asset descriptor migration parity", () => {
  it("normalizes uploaded asset descriptors into provider object locators", () => {
    const result = normalizeUploadImageReferenceForProvider({
      id: "row-1",
      context: "estimate-row-source-snapshot",
      imageAsset: estimateRowDescriptor(),
    });

    expect(result).toEqual({
      ok: true,
      id: "row-1",
      context: "estimate-row-source-snapshot",
      source: "asset_descriptor",
      action: "none",
      locator: {
        bucket: "project-images",
        path: PROJECT_IMAGE_PATH,
        thumbnailPath: PROJECT_IMAGE_THUMB_PATH,
      },
      brokerUrl: `/api/projects/images?path=${encodeURIComponent(PROJECT_IMAGE_PATH)}`,
    });
  });

  it("normalizes brokered private image URLs without provider lock-in", () => {
    expect(normalizeUploadImageReferenceForProvider({
      id: "component-1",
      context: "component-library",
      imageUrl: `/api/component-library/images?path=${encodeURIComponent(COMPONENT_IMAGE_PATH)}`,
    })).toEqual({
      ok: true,
      id: "component-1",
      context: "component-library",
      source: "brokered_private",
      action: "none",
      locator: { bucket: "component-images", path: COMPONENT_IMAGE_PATH },
      brokerUrl: `/api/component-library/images?path=${encodeURIComponent(COMPONENT_IMAGE_PATH)}`,
    });

    expect(normalizeUploadImageReferenceForProvider({
      id: "row-1",
      context: "estimate-row-source-snapshot",
      imageUrl: `/api/projects/images?path=${encodeURIComponent(PROJECT_IMAGE_PATH)}`,
    })).toEqual(expect.objectContaining({
      ok: true,
      source: "brokered_private",
      locator: { bucket: "project-images", path: PROJECT_IMAGE_PATH },
    }));
  });

  it("plans legacy public component image rewrites to brokered private URLs", () => {
    const result = normalizeUploadImageReferenceForProvider({
      id: "component-legacy",
      context: "component-library",
      imageUrl: `https://example.supabase.co/storage/v1/object/public/component-images/${COMPONENT_IMAGE_PATH}`,
    });

    expect(result).toEqual({
      ok: true,
      id: "component-legacy",
      context: "component-library",
      source: "legacy_public_component_image",
      action: "rewrite_legacy_public_to_broker",
      locator: { bucket: "component-images", path: COMPONENT_IMAGE_PATH },
      brokerUrl: `/api/component-library/images?path=${encodeURIComponent(COMPONENT_IMAGE_PATH)}`,
    });
  });

  it("keeps mismatched descriptors and unsafe legacy references out of automated migration", () => {
    const mismatchedDescriptor = normalizeUploadImageReferenceForProvider({
      id: "row-mismatch",
      context: "estimate-row-source-snapshot",
      imageAsset: estimateRowDescriptor({
        url: `/api/projects/images?path=${encodeURIComponent("workspace-1/user-1/project-images/project-2/wrong.webp")}`,
      }),
    });
    const unsafeLegacyUrl = normalizeUploadImageReferenceForProvider({
      id: "component-unsafe",
      context: "component-library",
      imageUrl: "https://example.supabase.co/storage/v1/object/public/component-images/workspace-1/user-1/%2e%2e/evil.webp",
    });
    const summary = summarizeUploadReferencePortability([
      mismatchedDescriptor,
      unsafeLegacyUrl,
      normalizeUploadImageReferenceForProvider({
        id: "local",
        context: "component-library",
        imageUrl: "/component-thumbnails/lib-sofa.jpg",
      }),
    ]);

    expect(mismatchedDescriptor).toEqual({
      ok: false,
      id: "row-mismatch",
      context: "estimate-row-source-snapshot",
      action: "manual_review",
      reason: "descriptor_url_mismatch",
    });
    expect(unsafeLegacyUrl).toEqual({
      ok: false,
      id: "component-unsafe",
      context: "component-library",
      action: "manual_review",
      reason: "unsafe_url",
    });
    expect(summary).toEqual({
      total: 3,
      providerBacked: 0,
      needsLegacyRewrite: 0,
      readyWithoutProviderObject: 1,
      manualReview: 2,
    });
  });
});
